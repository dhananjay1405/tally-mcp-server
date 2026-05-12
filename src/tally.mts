import http from 'node:http';
import nunjucks from 'nunjucks';
import { XMLParser } from 'fast-xml-parser';
import * as m from './models.mjs';
import { utility } from './utility.mjs';
import { lstCollectionFields, lstPushXml, lstReportConfig, lstReportXml, xmlInvokeAction, xmlQueryCollection } from './definition.mjs';

const tally_port = parseInt(process.env.TALLY_PORT || '9000'); // default to 9000 XML port of Tally
const lstPullReport: m.ModelPullReportInfo[] = lstReportConfig;

const nEnv = new nunjucks.Environment();
nEnv.addFilter('formatDate', (dt: Date, format: string) => {
    return utility.Date.format(dt, format);
});

export function renameObjectArrayProperties(source: any[], keyMap: Map<string, string>): any[] {
    if (!Array.isArray(source) || source.length == 0)
        return [];

    if (!(keyMap instanceof Map) || keyMap.size == 0)
        return source.map(item => item);

    return source.map(item => {
        if (!item || typeof item !== 'object' || Array.isArray(item))
            return item;

        let renamed: any = {};
        for (const [key, value] of Object.entries(item)) {
            let targetKey = keyMap.get(key) || key;
            Object.defineProperty(renamed, targetKey, { enumerable: true, value });
        }
        return renamed;
    });
}

export async function fetchReport(targetReport: string, inputParams: Map<string, any>): Promise<m.ModelPullResponse> {
    let retval: m.ModelPullResponse = {
        data: undefined
    };

    try {
        let objReport = lstPullReport.find(p => p.name == targetReport);

        if (objReport) {

            let lstInputs = new Map<string, any>();

            //set target company
            let targetCompany = '##SVCurrentCompany'; //default value
            if (inputParams.has('targetCompany') && typeof inputParams.get('targetCompany') == 'string')
                targetCompany = inputParams.get('targetCompany'); //extract from request object

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
                        return retval;
                    }
                }

                //parse the value based on type
                if (typeof _value == 'number' && iType == 'number')
                    lstInputs.set(iName, _value);
                else if (typeof _value == 'boolean' && iType == 'boolean')
                    lstInputs.set(iName, _value);
                else if (typeof _value == 'string' && iType == 'date' && /^\d\d-\d\d-\d\d\d\d$/.test(_value)) //Date in DD-MM-YYYY
                    lstInputs.set(iName, utility.Date.parse(_value, 'dd-MM-yyyy'));
                else if (typeof _value == 'string' && iType == 'date' && /^\d\d\d\d-\d\d-\d\d/.test(_value)) //ISO DateTime YYYY-MM-DDTHH:MM:SS
                    lstInputs.set(iName, utility.Date.parse(_value.substring(0, 10), 'yyyy-MM-dd'));
                else if (typeof _value == 'string' && iType == 'string')
                    lstInputs.set(iName, _value);
                else {
                    retval.error = `Parameter ${iName} not found or contains invalid value [${_value}]`;
                    return retval;
                }
            }
            retval = await extractReport(objReport, lstInputs);
        }
        else
            retval.error = 'Invalid report';

    } catch (err) {
        retval.error = 'Server exception';
    } finally {
        return retval;
    }

}

export async function queryCollection(targetCollection: string, lstFields: string[], lstFilters: Map<string, string>, targetCompany?: string, fromDate?: Date, toDate?: Date): Promise<any[]> {
    let retval: any[] = [];
    try {
        let objTemplateArgs = new Map<string, any>();

        //assign static variables
        if (targetCompany)
            objTemplateArgs.set('targetCompany', targetCompany);
        if (fromDate)
            objTemplateArgs.set('fromDate', fromDate);
        if (toDate)
            objTemplateArgs.set('toDate', toDate);

        objTemplateArgs.set('collection', targetCollection);

        let objCollection: m.TallyCollectionDefinition = lstCollectionFields.filter(c => c.collection == targetCollection)[0]; //load collection definition
        let lstQueryFields = objCollection.fields.filter(f => lstFields.includes(f.name)); //filter fields based on user query
        objTemplateArgs.set('fields', lstQueryFields); //filter fields queried by user

        if (lstFilters && lstFilters.size > 0) {
            let objFilters: m.TallyFilterDefinition[] = [];
            for (const [k, v] of lstFilters.entries()) {
                objFilters.push({
                    name: k,
                    expression: v
                });
            }
            objTemplateArgs.set('filters', objFilters); //add filters to template arguments
        }

        let respContent = await sendTallyXml(xmlQueryCollection, objTemplateArgs); //send XML to Tally and get response

        let xmlParser = new XMLParser({
            parseTagValue: false,
            isArray(tagName) {
                return (tagName == 'ROW' || tagName.endsWith('.LIST'))
            },
        });
        let resultObj = xmlParser.parse(respContent);
        if (resultObj['DATA'] && Array.isArray(resultObj['DATA']['ROW'])) {
            for (const rowObj of resultObj['DATA']['ROW']) {
                let o: any = new Object();
                for (const field of lstQueryFields) {
                    let _value = rowObj[field.name.toUpperCase()].toString();
                    let value: number | string | boolean | Date | null | undefined = undefined;
                    if (field.datatype == 'boolean')
                        value = _value == 'Yes';
                    else if (field.datatype == 'number' || field.datatype == 'amount' || field.datatype == 'quantity' || field.datatype == 'rate')
                        value = parseFloat(_value);
                    else if (field.datatype == 'date')
                        value = utility.Date.parse(_value, 'yyyy-MM-dd');
                    else
                        value = utility.String.unescapeHTML(_value);

                    Object.defineProperty(o, field.name, { enumerable: true, value });
                }
                retval.push(o);
            }
        }
        return retval;
    } catch (err) {
        throw err;
    }

};

export async function invokeTallyAction(targetAction: string, lstParameters: Map<string, any>): Promise<void> {
    try {
        let objTemplateArgs = new Map<string, any>();

        objTemplateArgs.set('targetReport', targetAction);

        let variables: { name: string, value: any }[] = [];
        lstParameters.forEach((v, k) => {
            variables.push({ name: k, value: v });
        });
        objTemplateArgs.set('variables', variables);

        await sendTallyXml(xmlInvokeAction, objTemplateArgs); //send XML to Tally
    } catch (err) {
        throw err;
    }

}

export async function importMasters(targetMaster: string, objMasterInput: Map<string, any>): Promise<m.CreateUpdateDeleteStatus> {
    try {
        let xmlTemplate = lstPushXml.get(targetMaster) || '';
        let respContent = await sendTallyXml(xmlTemplate, objMasterInput); //send XML to Tally and get response
        const xmlParser = new XMLParser();
        let resultObj = xmlParser.parse(respContent);
        let retval: m.CreateUpdateDeleteStatus = resultObj['RESPONSE'];
        return retval;
    } catch (err) {
        throw err;
    }
}

async function sendTallyXml(xml: string, lstVariables: Map<string, any>): Promise<string> {
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

        let xmlRequest = nEnv.renderString(xml, o);
        let xmlResponse = await postTallyXML(xmlRequest);
        return xmlResponse;
    } catch (err) {
        throw err;
    }
}

async function postTallyXML(xml: string): Promise<string> {
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
            req.on('error', (reqError: NodeJS.ErrnoException) => {
                let errorType = reqError['message'] || reqError['code'];
                if (errorType === 'ECONNREFUSED')
                    reject('Unable to connect to Tally. Ensure Tally is running and XML server is enabled on port ' + tally_port + ' by going to Help (F1) > Settings > Connectivity in Tally and setting Client / Server configuration, set Tally Prime is action as Server');
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

            let parseDate = (iDate: string): Date | null => {
                if (/^\d\d\d\d-\d\d-\d\d$/.test(iDate))
                    return utility.Date.parse(iDate, 'yyyy-MM-dd');
                else if (/^\d?\d-\w\w\w-\d\d\d\d$/.test(iDate))
                    return utility.Date.parse(iDate, 'd-MMM-yyyy');
                else if (/^\d?\d-\w\w\w-\d\d$/.test(iDate)) {
                    return utility.Date.parse(iDate, 'd-MMM-yy');
                }
                else
                    return null
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
                        let tagName = prop.name.toUpperCase();
                        let datatype = prop.datatype;
                        let fieldName = prop.name;

                        let value: any = undefined;
                        let _value = targetObjRows[r][tagName];
                        if (_value) {
                            if (datatype == 'number')
                                value = parseNumber(_value);
                            else if (datatype == 'date')
                                value = parseDate(_value);
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

            let tmplXML = lstReportXml.get(reportConfig.name) || '';
            let respContent = await sendTallyXml(tmplXML, reportInputParams);

            if (!respContent) {
                retval.error = 'Empty data received from Tally';
                return;
            }
            else if (respContent.startsWith('<EXCEPTION>')) {
                let regErr = respContent.match(/<EXCEPTION>(.+)<\/EXCEPTION>/g);
                let errorMessage = 'Unknown error';
                if (regErr && regErr[0])
                    errorMessage = regErr[0].substring(11, regErr[0].length - 12);

                retval.error = errorMessage;
                return;
            }

            let xmlParser = new XMLParser({
                parseTagValue: false,
                isArray(tagName) {
                    return (tagName == 'ROW' || tagName.endsWith('.LIST'))
                },
            });
            let resultObj = xmlParser.parse(respContent);

            let data: any[] = processRows(resultObj['DATA']['ROW'], reportConfig.output);
            retval.data = data;

        } catch (err) {
            throw err;
        } finally {
            resolve(retval);
        }
    });
}
