type DataChunk = {
    ChunkStart: number;
    Bars: BarData[];
}

type BarData = {
    Time: number;
    Open: number;
    High: number;
    Low: number;
    Close: number;
    TickVolume: number;
}

// Інтерфейс для цінових позицій (використовується для відтворення шкали цін)
type PricePosition ={
    price: number;
    y: number;
}