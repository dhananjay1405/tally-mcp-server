import crypto from 'node:crypto';
import duckdb from '@duckdb/node-api';
import { ModelPullReportOutputFieldInfo } from './models.mjs';
import { reportColumnMetadata } from './tally.mjs';

const instance = await duckdb.DuckDBInstance.create(':memory:');
const conn = await instance.connect();

const generateRandomString = (): string => {
    return 't_' + crypto.randomUUID().replace(/-/g, '');
};

export function cacheTable(reportName: string, data: any[]): Promise<string> {

    return new Promise<string>(async (resolve, reject) => {
        try {
            // no table to be created if no data is found
            if (!data || data.length === 0)
                return resolve('');

            const columns: ModelPullReportOutputFieldInfo[] = reportColumnMetadata(reportName) || [];

            // generate a random table name
            const tableId = generateRandomString();

            let sqlCreateTable = `CREATE OR REPLACE TABLE ${tableId} (`;

            // iterate through each column to create table schema columns
            for (const col of columns) {
                let sqlDataType = '';
                if (col.datatype === 'number')
                    sqlDataType = 'DECIMAL(18,4)';
                else if (col.datatype === 'boolean')
                    sqlDataType = 'BOOLEAN';
                else if (col.datatype === 'date')
                    sqlDataType = 'DATE';
                else
                    sqlDataType = 'TEXT';

                sqlCreateTable += `${col.name} ${sqlDataType}, `;
            }


            sqlCreateTable = sqlCreateTable.slice(0, -2); // remove trailing comma
            sqlCreateTable += `);`;
            await conn.run(sqlCreateTable);

            // iterate through each row to insert data
            const dbAppender = await conn.createAppender(tableId);

            for (const row of data) {
                for (const col of columns) {
                    let value = row[col.name];
                    if (col.datatype === 'number') {
                        if (!isNaN(value)) {
                            const n = BigInt(Math.round(value * 10000)); // 4 decimal places
                            const _value = new duckdb.DuckDBDecimalValue(n, 18, 4);
                            dbAppender.appendDecimal(_value);
                        }
                        else {
                            dbAppender.appendNull();
                        }
                    }
                    else if (col.datatype === 'boolean' && typeof value === 'boolean') {
                        dbAppender.appendBoolean(value);
                    }
                    else if (col.datatype === 'date') {
                        if (typeof value === 'object' && value instanceof Date) {
                            // calculate days since epoch from value
                            const daysSinceEpoch = Math.floor(value.getTime() / (1000 * 60 * 60 * 24));
                            const _value = new duckdb.DuckDBDateValue(daysSinceEpoch);
                            dbAppender.appendDate(_value);
                        }
                        else {
                            dbAppender.appendNull();
                        }
                    }
                    else {
                        dbAppender.appendVarchar(value || '');
                    }
                }
                dbAppender.endRow(); // append the row
            }
            dbAppender.closeSync(); // commit output into the table

            // set timeout to drop the table after 15 min
            setTimeout(async () => await conn.run(`DROP TABLE IF EXISTS ${tableId};`), 15 * 60 * 1000);

            resolve(tableId);
        } catch (err) {
            reject(err);
            console.error(JSON.stringify(err));
        }
    });
}

export async function executeSQL(sql: string): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
        try {
            const result = await conn.runAndReadAll(sql);
            const lstHeader = result.columnNames();
            const lstDataType = result.columnTypes()
            const lstData = result.getRows();

            // write header with tab separated values
            let retval = lstHeader.join('\t') + '\n';

            // iterate through each row and append tab separated values
            for (let r = 0; r < lstData.length; r++) {
                let lstRowValue: string[] = [];
                for (let c = 0; c < lstHeader.length; c++) {
                    let dataType = lstDataType[c];
                    let cellValue = lstData[r][c]?.valueOf();
                    let cellText  = lstData[r][c]?.toString() || '';
                    if (dataType.typeId === duckdb.DuckDBTypeId.DATE) {
                        // convert date to YYYY-MM-DD format
                        if (cellValue && typeof cellValue === 'object' && cellValue instanceof Date)
                            cellText = cellValue.toISOString().substring(0,10);
                    }
                    else if (dataType.typeId === duckdb.DuckDBTypeId.DECIMAL) {
                        // convert decimal to number to get rid of extra 0
                        if (cellValue && cellValue instanceof duckdb.DuckDBDecimalValue)
                            cellText = cellValue.toDouble().valueOf().toString();
                    }
                    lstRowValue.push(cellText);
                }
                retval += lstRowValue.join('\t') + '\n';
            }
            //remove last newline
            retval = retval.slice(0, -1);

            resolve(retval);
        } catch (err) {
            reject(err);
            console.error(JSON.stringify(err));
        }
    });
}