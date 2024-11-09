// dataService.ts

export default class DataService {
  private apiUrl: string;

  constructor(apiUrl: string) {
      this.apiUrl = apiUrl;
  }

  // Метод для загрузки даних з API
  public async fetchData(): Promise<{ ChunkStart: number; Bars: any[] }[]> {

      try {
          const response = await fetch(this.apiUrl);
          if (!response.ok) throw new Error('Failed to fetch data');
          const data = await response.json();

        return data;
      } catch (error) {
          console.error('Error fetching data:', error);
          return [];
      }
  }
}

