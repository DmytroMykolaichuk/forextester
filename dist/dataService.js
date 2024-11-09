// dataService.ts
export default class DataService {
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
    }
    // Метод для загрузки даних з API
    async fetchData() {
        try {
            const response = await fetch(this.apiUrl);
            if (!response.ok)
                throw new Error('Failed to fetch data');
            const data = await response.json();
            return data;
        }
        catch (error) {
            console.error('Error fetching data:', error);
            return [];
        }
    }
}
