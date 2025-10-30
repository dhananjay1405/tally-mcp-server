import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import nunjucks from 'nunjucks';
import { XMLParser } from 'fast-xml-parser';
import * as m from './models.mjs';
import { utility } from './utility.mjs';

const tally_port = parseInt(process.env.TALLY_PORT || '9000'); // default to 9000 XML port of Tally
const __dirname = import.meta.dirname;
const lstPullReport: m.ModelPullReportInfo[] = JSON.parse(fs.readFileSync(path.join(__dirname, '../pull/config.json'), 'utf-8'))['reports'];

nunjucks.configure({
    tags: {
        blockStart: '<nunjuck>',
        blockEnd: '</nunjuck>',
        variableStart: '{{',
        variableEnd: '}}',
        commentStart: '<comment>begin</comment>',
        commentEnd: '<comment>end</comment>'
    }
});

export function jsonToTSV(data: any[]): string {
    if (!data || data.length == 0)
        return '';
    let headers = Object.keys(data[0]);
    let tsv = headers.join('\t') + '\n';
    data.forEach(row => {
        let values = headers.map(header => {
            let value = row[header];
            if (typeof value === 'string') {
                value = value.replace(/\t/g, ' ').replace(/\n/g, ' ');
            }
            else if(typeof value === 'object' && value instanceof Date) {
                value = utility.Date.format(value, 'yyyy-MM-dd');
            }
            return value;
        });
        tsv += values.join('\t') + '\n';
    });
    return tsv;
}

export function handlePull(targetReport: string, inputParams: Map<string, any>): Promise<m.ModelPullResponse> {
    return new Promise<m.ModelPullResponse>(async (resolve, reject) => {
        let retval: m.ModelPullResponse = {
            data: undefined
        };
        try {
            let objReport = lstPullReport.find(p => p.name == targetReport);

            if (objReport) {

                let lstInputs = new Map<string, any>();

                //set target company
                let targetCompany = '##SVCurrentCompany'; //default value
                if (inputParams.has('targetCompany') && typeof inputParams.get(targetCompany) == 'string')
                    targetCompany = inputParams.get(targetCompany); //extract from request object

                lstInputs.set('targetCompany', targetCompany); //add targetCompany as one of the params

                //populate input parameters value
                for (let i = 0; i < objReport.input.length; i++) {
                    let iName = objReport.input[i].name;
                    let iType = objReport.input[i].datatype;

                    let _value = inputParams.get(iName);

                    //check if validation is required
                    if (objReport.input[i].validation_regex) {
                        let strValidationRegex = objReport.input[i].validation_regex || '';
                        let regPtrn = new RegExp(strValidationRegex, 'i');
                        if (typeof _value == 'string' && !regPtrn.test(_value)) {
                            retval.error = objReport.input[i].validation_message || `Invalid value for parameter ${iName}`;
                            return resolve(retval);
                        }
                    }

                    //parse the value based on type
                    if (typeof _value == 'number' && iType == 'number')
                        lstInputs.set(iName, _value);
                    else if (typeof _value == 'boolean' && iType == 'boolean')
                        lstInputs.set(iName, _value);
                    else if (typeof _value == 'string' && iType == 'date' && /^\d\d-\d\d-\d\d\d\d$/g.test(_value)) //Date in DD-MM-YYYY
                        lstInputs.set(iName, utility.Date.parse(_value, 'dd-MM-yyyy'));
                    else if (typeof _value == 'string' && iType == 'date' && /^\d\d\d\d-\d\d-\d\d/g.test(_value)) //ISO DateTime YYYY-MM-DDTHH:MM:SS
                        lstInputs.set(iName, utility.Date.parse(_value.substring(0, 10), 'yyyy-MM-dd'));
                    else if (typeof _value == 'string' && iType == 'string')
                        lstInputs.set(iName, _value);
                    else {
                        retval.error = `Parameter ${iName} not found or contains invalid value [${_value}]`;
                        return resolve(retval);
                    }
                }
                retval = await extractReport(objReport, lstInputs);
            }
            else
                retval.error = 'Invalid report';

        } catch (err) {
            retval.error = 'Server exception';
        } finally {
            resolve(retval);
        }
    });
}

function sendTally(xml: string, lstVariables: Map<string, any>): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
        try {

            // remove targetCompany from lstVariables if found with default value
            if (lstVariables.has('targetCompany') && lstVariables.get('targetCompany') == '##SVCurrentCompany') {
                lstVariables.delete('targetCompany');
            }

            let o = new Object();
            
            // define properties for every keys in Map in object
            lstVariables.forEach((v, k) => {
                Object.defineProperty(o, k, { enumerable: true, value: v });
            });

            let xmlRequest = nunjucks.renderString(xml, o);
            let xmlResponse = await postTallyXML(xmlRequest);
            resolve(xmlResponse);
        } catch (err) {
            reject('');
        }
    });
}

function postTallyXML(xml: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        try {

            let req = http.request({
                hostname: 'localhost',
                port: tally_port,
                path: '',
                method: 'POST',
                headers: {
                    'Content-Length': Buffer.byteLength(xml, 'utf16le'),
                    'Content-Type': 'text/xml;charset=utf-16'
                }
            },
                (res) => {
                    let data = '';
                    res
                        .setEncoding('utf16le')
                        .on('data', (chunk) => {
                            let result = chunk.toString() || '';
                            data += result;
                        })
                        .on('end', () => {
                            resolve(data);
                        })
                        .on('error', (httpErr) => {
                            reject(httpErr);
                        });
                });
            req.on('error', (reqError) => {
                if (reqError && reqError.message === 'ECONNREFUSED')
                    reject('Unable to connect to Tally');
                else
                    reject(reqError);
            });
            req.write(xml, 'utf16le');
            req.end();
        }
        catch (err) {
            reject(err);
        }
    });
}

function substituteTDLParameters(msg: string, substitutions: Map<string, any>): string {
    let retval = msg;
    substitutions.forEach((v, k) => {
        let regPtrn = new RegExp(`\\{${k}\\}`, 'g');
        if (typeof v === 'string')
            retval = retval.replace(regPtrn, utility.String.escapeHTML(v));
        else if (typeof v === 'number')
            retval = retval.replace(regPtrn, v.toString());
        else if (v instanceof Date)
            retval = retval.replace(regPtrn, utility.Date.format(v, 'd-MMM-yyyy'));
        else if (typeof v === 'boolean')
            retval = retval.replace(regPtrn, v ? 'Yes' : 'No');
        else;
    });
    return retval;
}

function extractReport(reportConfig: m.ModelPullReportInfo, reportInputParams: Map<string, any>): Promise<m.ModelPullResponse> {
    return new Promise<m.ModelPullResponse>(async (resolve, reject) => {
        let retval: m.ModelPullResponse = {
            data: undefined
        };
        try {

            let parseString = (iStr: string): string => {
                iStr = utility.String.unescapeHTML(iStr);
                iStr = iStr.replace(/&#\d+;/g, ''); //remove unreadable characters;
                return iStr;
            }

            let parseDate = (iDate: string): string => {
                if (/^\d\d\d\d-\d\d-\d\d$/g.test(iDate))
                    return utility.Date.format(new Date(iDate), 'dd-MMM-yyyy');
                else if (/^\d?\d-\w\w\w-\d\d\d\d$/g.test(iDate))
                    return iDate.padStart(11, '0');
                else if (/^\d?\d-\w\w\w-\d\d$/g.test(iDate)) {
                    let _iDate = utility.Date.parse(iDate, 'd-MMM-yy');
                    if (_iDate)
                        return utility.Date.format(_iDate, 'dd-MMM-yyyy');
                    else
                        return ''
                }
                else
                    return ''
            }

            const parseQuantity = (iStr: string): number => {
                let regPatOutput = /^(-?\d+\.\d+|-?\d+)\s.+/g.exec(iStr);
                if (regPatOutput && typeof regPatOutput[1] == 'string' && !isNaN(parseFloat(regPatOutput[1])))
                    return parseFloat(regPatOutput[1]);
                else
                    return 0;
            }

            const parseNumber = (iNum: string) => {
                if (!iNum)
                    return 0;
                else
                    return parseFloat(iNum.replace(/[\(\),]+/g, ''));
            }

            const processRows = (targetObjRows: any[], targetConfigFields: m.ModelPullReportOutputFieldInfo[]): any[] => {
                let data: any[] = [];
                let rowCount = targetObjRows.length;

                //loop through rows
                for (let r = 0; r < rowCount; r++) {
                    let o: any = new Object();

                    //loop through each field and extract value
                    for (const prop of targetConfigFields) {
                        let tagName = prop.identifier;
                        let datatype = prop.datatype;
                        let fieldName = prop.name;

                        let value: any = undefined;
                        let _value = targetObjRows[r][tagName];
                        if (_value) {
                            if (datatype == 'array' && Array.isArray(prop.fields))
                                value = processRows(targetObjRows[r][tagName], prop.fields); //recursive call to process nested array
                            else if (datatype == 'number')
                                value = parseNumber(_value);
                            else if (datatype == 'boolean')
                                value = _value == '1';
                            else if (datatype == 'quantity')
                                value = parseQuantity(_value);
                            else
                                value = parseString(_value);
                        }

                        Object.defineProperty(o, fieldName, { enumerable: true, value });
                    }

                    //add row to array
                    data.push(o);
                }

                return data;
            }

            let tmplXML = fs.readFileSync(path.join(__dirname, `../pull/${reportConfig.name}.xml`), 'utf-8'); //load XML template
            tmplXML = substituteTDLParameters(tmplXML, reportInputParams); //substitute angular bracket params with values
            let respContent = await sendTally(tmplXML, reportInputParams);

            if (!respContent) {
                retval.error = 'Empty data received from Tally';
                return;
            }
            else if (respContent.startsWith('<EXCEPTION>')) {
                let regErr = respContent.match(/<EXCEPTION>(.+)<\/EXCEPTION>/g);
                let errorMessage = 'Unknown error';
                if (regErr && regErr[0])
                    errorMessage = regErr[0].substring(11, regErr[0].length - 23);

                retval.error = errorMessage;
                return;
            }

            let xmlParser = new XMLParser({
                parseTagValue: false,
                isArray(tagName, jPath, isLeafNode, isAttribute) {
                    return (tagName == 'ROW' || tagName.endsWith('.LIST'))
                },
            });
            let resultObj = xmlParser.parse(respContent);

            //process response based on the type of output
            if (reportConfig.output.datatype == 'array' && reportConfig.output.fields) {

                let data: any[] = processRows(resultObj['DATA']['ROW'], reportConfig.output.fields);
                retval.data = data;
            }
            else {
                if (resultObj['DATA'] && resultObj['DATA']['ROW'] && !resultObj['DATA']['ROW']['VALUE']) {
                    let _value: string = resultObj['DATA']['ROW'][0]['VALUE'];
                    if (reportConfig.output.datatype == 'number')
                        retval.data = parseNumber(_value);
                    else if (reportConfig.output.datatype == 'boolean')
                        retval.data = _value == '1'
                    else if (reportConfig.output.datatype == 'date')
                        retval.data = parseDate(_value);
                    else
                        retval.data = parseString(_value);
                }
            }

        } catch (err) {
        } finally {
            resolve(retval);
        }
    });
}
