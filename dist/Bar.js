// Bar.ts
export class Bar {
    constructor(data) {
        this.data = data;
    }
    // Получение значения открытия
    getOpen() {
        return this.data.Open;
    }
    // Получение значения закрытия
    getClose() {
        return this.data.Close;
    }
    // Получение значения максимума
    getHigh() {
        return this.data.High;
    }
    // Получение значения минимума
    getLow() {
        return this.data.Low;
    }
    // Получение времени
    getTime() {
        return this.data.Time;
    }
    // Получение объема сделок
    getTickVolume() {
        return this.data.TickVolume;
    }
}
