import { neon } from '@neondatabase/serverless';
import * as m from './models.mjs';

export function getQueryResult(query: string, params: any[] = []): Promise<m.ModelPullResponse> {
    return new Promise<m.ModelPullResponse>(async (resolve) => {
        try {
            const sqlClient = neon(process.env.CONNECTION_STRING as string);
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