import { requestUrl } from "obsidian";

export class CurieApiClient
{
    constructor(private baseUrl: string) { }

    async post<T>(path: string, body: any): Promise<T>
    {
        const res = await requestUrl({
            url: `${this.baseUrl}${path}`,
            method: "POST",
            body: JSON.stringify(body),
            headers: { "Content-Type": "application/json" }
        });

        return res.json as T;
    }

    async get<T>(path: string): Promise<T>
    {
        const res = await requestUrl({
            url: `${this.baseUrl}${path}`,
            method: "GET"
        });

        return res.json as T;
    }
}
