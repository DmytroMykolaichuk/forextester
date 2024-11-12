export class TimeManager {
    private ctx:CanvasRenderingContext2D
    private firstVisibleBarTime: number = 0;
    private lastVisibleBarTime: number = 0;
    private zoomLevel:number =6

    constructor(ctx) {
        this.ctx = ctx;
    }
    // Метод для форматування дати
    public formatDate(date: Date): string {
            return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1)
                .toString()
                .padStart(2, '0')}.${date.getFullYear()}`;
    }
    
    // Метод для форматування часу
    public formatTime(date: Date): string {
            return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    
    // Метод для форматування дати та часу
    public formatDateTime(date: Date): string {
            return `${this.formatDate(date)} ${this.formatTime(date)}`;
    }

    // Метод для визначення видимого діапазону та інтервалу
    public initialVisibleRangeAndInterval(): void {
        const intervals = ['1 day', '12 hours', '6 hours', '3 hours', '1 hour', '30 minutes', '15 minutes', '5 minutes', '1 minute'];
        const currentInterval = intervals[Math.max(0, Math.min(this.zoomLevel, intervals.length - 1))];
    
        // Відображення часових діапазонів видимих барів та поточного інтервалу
        const firstDate = new Date(this.firstVisibleBarTime * 1000);
        const lastDate = new Date(this.lastVisibleBarTime * 1000);
    
        const firstDateString = this.formatDateTime(firstDate);
        const lastDateString = this.formatDateTime(lastDate);
    
        this.ctx.fillStyle = 'black';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left'; // Вирівнювання тексту по лівому краю
        const timeRangeText = `Visible Range: ${firstDateString} - ${lastDateString} (Interval: ${currentInterval})`;
        this.ctx.fillText(timeRangeText, 30, 20);
    }

    public updateCurrentPeriod(firstBar:number,lastBar:number):void {
        this.firstVisibleBarTime = firstBar;
        this.lastVisibleBarTime = lastBar;
    }
    public getCurrentPeriod():{firstVisibleBarTime:number,lastVisibleBarTime:number} {
        return {
            firstVisibleBarTime: this.firstVisibleBarTime,
            lastVisibleBarTime: this.lastVisibleBarTime
        }
    }
}