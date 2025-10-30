import { neon } from '@neondatabase/serverless';
export function getQueryResult(query, params = []) {
    return new Promise(async (resolve) => {
        try {
            const sqlClient = neon(process.env.CONNECTION_STRING);
            const result = await sqlClient.query(query, params);
            resolve({
                data: result
            });
        }
        catch (err) {
            resolve({
                data: undefined,
                error: 'SQL query error'
            });
        }
    });
}
//# sourceMappingURL=database.mjs.map