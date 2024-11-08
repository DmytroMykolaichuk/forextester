// dataService.ts

export default class DataService {
  private apiUrl: string;

  constructor(apiUrl: string) {
      this.apiUrl = apiUrl;
  }

  // Метод для загрузки данных с API
  public async fetchData(): Promise<{ ChunkStart: number; Bars: any[] }[]> {

      try {
          const response = await fetch(this.apiUrl);
          if (!response.ok) throw new Error('Failed to fetch data');
          const data = await response.json();
          
          // Обработка данных и фильтрация дублей
          // const uniqueData = Array.from(new Set(data.map(item => JSON.stringify(item))))
          //                         .map(item => JSON.parse(item));

        return data;
      } catch (error) {
          console.error('Error fetching data:', error);
          return [];
      }
  }
}

