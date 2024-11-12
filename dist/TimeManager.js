export class TimeManager {
    constructor(ctx) {
        this.firstVisibleBarTime = 0;
        this.lastVisibleBarTime = 0;
        this.private = 6;
        this.ctx = ctx;
    }
    // Метод для форматування дати
    formatDate(date) {
        return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1)
            .toString()
            .padStart(2, '0')}.${date.getFullYear()}`;
    }
    // Метод для форматування часу
    formatTime(date) {
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    // Метод для форматування дати та часу
    formatDateTime(date) {
        return `${this.formatDate(date)} ${this.formatTime(date)}`;
    }
    // Метод для визначення видимого діапазону та інтервалу
    initialVisibleRangeAndInterval() {
        const intervals = ['1 day', '12 hours', '6 hours', '3 hours', '1 hour', '30 minutes', '15 minutes', '5 minutes', '1 minute'];
        const currentInterval = intervals[Math.max(0, Math.min(this.zoomLevel, intervals.length - 1))];
        console.log(currentInterval, this.zoomLevel);
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
    updateCurrentPeriod(firstBar, lastBar) {
        this.firstVisibleBarTime = firstBar;
        this.lastVisibleBarTime = lastBar;
    }
    getCurrentPeriod() {
        return {
            firstVisibleBarTime: this.firstVisibleBarTime,
            lastVisibleBarTime: this.lastVisibleBarTime
        };
    }
    updateZoom(newZoom) {
        this.zoomLevel = newZoom;
        console.log(newZoom);
    }
}
