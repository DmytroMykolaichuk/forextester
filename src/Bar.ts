// Bar.ts

export class Bar {
    private data: BarData;

    constructor(data: BarData) {
        this.data = data;
    }

    // Получение значения открытия
    public getOpen(): number {
        return this.data.Open;
    }

    // Получение значения закрытия
    public getClose(): number {
        return this.data.Close;
    }

    // Получение значения максимума
    public getHigh(): number {
        return this.data.High;
    }

    // Получение значения минимума
    public getLow(): number {
        return this.data.Low;
    }

    // Получение времени
    public getTime(): number {
        return this.data.Time;
    }

    // Получение объема сделок
    public getTickVolume(): number {
        return this.data.TickVolume;
    }
}
