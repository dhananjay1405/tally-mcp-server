import crypto from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

const pg = await PGlite.create('memory://');

const PG_DATE_OID = 1082;
const PG_NUMERIC_OID = 1700;

const generateRandomString = (): string => {
    return 't_' + crypto.randomUUID().replace(/-/g, '');
};

export async function cacheTable(lstColumnMetadata: Map<string, string>, data: any[]): Promise<string> {
    try {
        // no table to be created if no data is found
        if (!data || data.length === 0)
            return '';

        // generate a random table name
        const tableId = generateRandomString();

        // Quote a PostgreSQL identifier to prevent injection via column names
        const quoteIdent = (name: string) => `"${name.replace(/"/g, '""')}"`;

        let sqlCreateTable = `CREATE TABLE ${tableId} (`;

        // iterate through each column to create table schema columns
        for (const [colName, colType] of lstColumnMetadata) {
            let sqlDataType = '';
            if (colType === 'number' || colType === 'amount' || colType === 'quantity' || colType === 'rate')
                sqlDataType = 'NUMERIC(18,4)';
            else if (colType === 'boolean')
                sqlDataType = 'BOOLEAN';
            else if (colType === 'date')
                sqlDataType = 'DATE';
            else
                sqlDataType = 'TEXT';

            sqlCreateTable += `${quoteIdent(colName)} ${sqlDataType}, `;
        }

        sqlCreateTable = sqlCreateTable.slice(0, -2); // remove trailing comma
        sqlCreateTable += `);`;
        await pg.exec(sqlCreateTable);

        // iterate through each row to insert data
        const colNames = Array.from(lstColumnMetadata.keys()).map(quoteIdent).join(', ');
        const placeholders = Array.from(lstColumnMetadata.keys()).map((_, i) => `$${i + 1}`).join(', ');
        const insertSQL = `INSERT INTO ${tableId} (${colNames}) VALUES (${placeholders})`;

        await pg.transaction(async (tx) => {
            for (const row of data) {
                const values = Array.from(lstColumnMetadata.entries()).map(([colName, colType]) => {
                    const value = row[colName];
                    if (colType === 'number' || colType === 'amount' || colType === 'quantity' || colType === 'rate') {
                        return !isNaN(value) ? Number(value) : null;
                    } else if (colType === 'boolean') {
                        return typeof value === 'boolean' ? value : null;
                    } else if (colType === 'date') {
                        return value instanceof Date ? value : null;
                    } else {
                        return value || '';
                    }
                });
                await tx.query(insertSQL, values);
            }
        });

        // set timeout to drop the table after 15 min
        setTimeout(async () => await pg.exec(`DROP TABLE IF EXISTS ${tableId};`), 15 * 60 * 1000);

        return tableId;
    } catch (err) {
        console.error(err);
        throw err;
    }
}

export async function executeSQL(sql: string, format: string = 'JSON Array of Objects'): Promise<string> {
    try {
        // Strip comments, then enforce SELECT-only to prevent data modification or DDL injection
        const stripped = sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '').trim();
        if (!/^select\b/i.test(stripped))
            throw new Error('Only SELECT queries are permitted');

        const result = await pg.query<unknown[]>(sql, [], { rowMode: 'array' });
        const lstHeader = result.fields.map(f => f.name);
        const lstDataType = result.fields.map(f => f.dataTypeID);
        const lstData = result.rows;

        const normalizeCellValue = (cellValue: unknown, dataTypeID: number): string | number | boolean | null => {
            if (cellValue === null || cellValue === undefined)
                return null;

            if (dataTypeID === PG_DATE_OID) {
                // PGlite returns DATE as 'YYYY-MM-DD' string; handle Date objects just in case
                if (cellValue instanceof Date)
                    return cellValue.toISOString().substring(0, 10);
                return cellValue.toString();
            }

            if (dataTypeID === PG_NUMERIC_OID) {
                // strip trailing zeros (e.g. '1.5000' -> '1.5')
                const num = parseFloat(cellValue.toString());
                if (!isNaN(num))
                    return num;
            }

            if (typeof cellValue === 'boolean')
                return cellValue;

            return cellValue.toString();
        };

        const normalizedRows = lstData.map((row) => {
            return row.map((cellValue, c) => normalizeCellValue(cellValue, lstDataType[c]));
        });

        if (format === 'CSV') {
            const escapeCSV = (value: string): string => {
                if (/[,"\n\r]/.test(value))
                    return `"${value.replace(/"/g, '""')}"`;
                return value;
            };

            let retval = lstHeader.map((h) => escapeCSV(h)).join(',') + '\n';
            for (const row of normalizedRows) {
                const csvRow = row.map((v) => escapeCSV(v === null ? '' : v.toString())).join(',');
                retval += csvRow + '\n';
            }
            return retval.slice(0, -1);
        }

        if (format === 'Markdown Table') {
            const escapeMarkdown = (value: string): string => value.replace(/\|/g, '\\|');

            let retval = '| ' + lstHeader.map((h) => escapeMarkdown(h)).join(' | ') + ' |\n';
            retval += '| ' + lstHeader.map(() => '---').join(' | ') + ' |\n';
            for (const row of normalizedRows) {
                const mdRow = row.map((v) => escapeMarkdown(v === null ? '' : v.toString())).join(' | ');
                retval += '| ' + mdRow + ' |\n';
            }
            return retval.slice(0, -1);
        }

        if (format === 'JSON with Schema and Rows') {
            return JSON.stringify({
                schema: result.fields.map(f => f.name),
                rows: normalizedRows
            });
        }

        // default: JSON Array of Objects
        const rowsAsObjects = normalizedRows.map((row) => {
            const item: Record<string, string | number | boolean | null> = {};
            for (let c = 0; c < lstHeader.length; c++) {
                item[lstHeader[c]] = row[c];
            }
            return item;
        });

        return JSON.stringify(rowsAsObjects);
    } catch (err) {
        console.error(err);
        throw err;
    }
}