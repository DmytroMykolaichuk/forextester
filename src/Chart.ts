// Chart.ts

import { Bar, BarData } from './Bar';

export class Chart {
    public canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private data: Bar[];
    // private scale: number;
    private offsetX: number;
    private chunkStart: number;
    private zoomLevel: number;
    private padding: number;

    constructor(canvas: HTMLCanvasElement, data: BarData[], chunkStart: number) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.data = data.map(barData => new Bar(barData)); // преобразуем данные в экземпляры Bar
        // this.scale = 20; // увеличенный начальный масштаб для лучшей видимости
        this.offsetX = 0; // начальное смещение
        this.chunkStart = chunkStart; // время начала сегмента данных
        this.zoomLevel = 6; // начальный уровень зума (соответствует 1 часу)
        this.padding = 30; // уменьшенный padding перед первым и после последнего бара
    }

    // Метод для группировки баров для текущего уровня зума
    private groupBarsByZoomLevel(): BarData[] {
        const zoomDurations = [
            // 24 * 60, // 1 день в минутах
            // 12 * 60, // 12 часов
            6 * 60,  // 6 часов
            3 * 60,  // 3 часа
            60,      // 1 час
            30,      // 30 минут
            15,      // 15 минут
            5,       // 5 минут
            1        // 1 минута
        ];
        const durationInMinutes = zoomDurations[Math.max(0, Math.min(this.zoomLevel, zoomDurations.length - 1))];
        console.log(durationInMinutes)

        // if (durationInMinutes === 0) {
        //     return this.data.map(bar => bar.getBarData()); // исправлено с bar.getData() на bar.getBarData()
        // }

        const groupedBars: BarData[] = [];
        for (let i = 0; i < this.data.length; i += durationInMinutes) {
            const group = this.data.slice(i, i + durationInMinutes);
            if (group.length > 0) {
                const open = group[0].getOpen();
                const close = group[group.length - 1].getClose();
                const high = Math.max(...group.map(bar => bar.getHigh()));
                const low = Math.min(...group.map(bar => bar.getLow()));
                const tickVolume = group.reduce((sum, bar) => sum + bar.getTickVolume(), 0) / group.length;
                groupedBars.push({
                    Time: group[0].getTime() + this.chunkStart, // добавляем chunkStart к Time
                    Open: open,
                    High: high,
                    Low: low,
                    Close: close,
                    TickVolume: tickVolume
                });
            }
        }

        return groupedBars;
    }

    // Метод для отображения графика
    public render() {
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Очистка canvas
        this.ctx.clearRect(0, 0, width, height);

        // Отрисовка названия графика (ChunkStart как дата)
        const chunkStartDate = new Date(this.chunkStart * 1000);
        this.ctx.fillStyle = 'black';
        this.ctx.font = '12px Arial';
        this.ctx.fillText(`Data from: ${chunkStartDate.toLocaleDateString('ua-UA')}`, 10, 20);

        const groupedBars = this.groupBarsByZoomLevel();

        // Найдем максимальную и минимальную цену для нормализации
        const maxPrice = Math.max(...groupedBars.map(bar => bar.High));
        const minPrice = Math.min(...groupedBars.map(bar => bar.Low));
        const priceRange = maxPrice - minPrice;

        // Устанавливаем стиль для линий и текста
        this.ctx.lineWidth = 1;

        // Отрисовываем каждый бар
        const barSpacing = 5;
        const barWidth = 10;
        const availableHeight = height - 80; // уменьшаем доступное пространство для баров, чтобы освободить место для шкалы дат

        groupedBars.forEach((bar, index) => {
            const barX = index * (barWidth + barSpacing) + this.offsetX + this.padding;
            // Нормализуем координаты Y для отображения
            const barOpenY = height - ((bar.Open - minPrice) / priceRange) * availableHeight - 30;
            const barCloseY = height - ((bar.Close - minPrice) / priceRange) * availableHeight - 30;
            const barHighY = height - ((bar.High - minPrice) / priceRange) * availableHeight - 30;
            const barLowY = height - ((bar.Low - minPrice) / priceRange) * availableHeight - 30;

            // Проверяем, находится ли бар в пределах видимости
            if (barX + barWidth > 0 && barX - barWidth < width) {
                // Устанавливаем цвет бара в зависимости от направления движения цены
                if (bar.Close > bar.Open) {
                    this.ctx.fillStyle = 'green'; // восходящий бар
                } else {
                    this.ctx.fillStyle = 'red'; // нисходящий бар
                }

                // Рисуем линии High и Low
                this.ctx.strokeStyle = 'black';
                this.ctx.beginPath();
                this.ctx.moveTo(barX, barHighY);
                this.ctx.lineTo(barX, barLowY);
                this.ctx.stroke();

                // Рисуем тело бара
                this.ctx.fillRect(barX - barWidth / 2, Math.min(barOpenY, barCloseY), barWidth, Math.abs(barOpenY - barCloseY));

                // Рисуем объем под каждой свечой (Tick Volume)
                const volumeHeight = (bar.TickVolume / Math.max(...groupedBars.map(bar => bar.TickVolume))) * 50; // нормализуем объем к высоте 50
                this.ctx.fillStyle = 'blue';
                this.ctx.fillRect(barX - barWidth / 2, height - volumeHeight - 20, barWidth, volumeHeight);
            }
        });

        // Отрисовываем шкалу цен (простые деления справа)
        this.ctx.fillStyle = 'black';
        // const priceSteps = 5;
        // for (let i = 0; i <= priceSteps; i++) {
        //     const price = minPrice + (priceRange / priceSteps) * i;
        //     const y = height - ((price - minPrice) / priceRange) * availableHeight - 20;
        //     this.ctx.fillText(price.toFixed(2), width - 50, y);
        // }

        // Отрисовываем шкалу дат (простые деления снизу)
        const uniqueDates = new Set<string>();
        const dateSteps = Math.min(10, groupedBars.length); // максимум 10 дат
        for (let i = 0; i < dateSteps; i++) {
            const bar = groupedBars[Math.floor((groupedBars.length / dateSteps) * i)];
            const date = new Date(bar.Time * 1000); // изменено: Time уже включает chunkStart
            const formattedDate = this.getFormattedDateForZoom(date);
            if (!uniqueDates.has(formattedDate)) {
                uniqueDates.add(formattedDate);
                const x = Math.min(i * (width / dateSteps) + this.offsetX % (width / dateSteps) + this.padding, width - this.padding);
                this.ctx.fillText(formattedDate, x, height - 5);
            }
        }
    }

    // Метод для получения формата даты в зависимости от уровня зума
    private getFormattedDateForZoom(date: Date): string {
        const zoomDurations = [
            'dd.MM.yyyy', // 1 день
            'HH:mm',      // 12 часов, 6 часов, 3 часа, 1 час, 30 минут, 15 минут, 5 минут, 1 минута
        ];
        if (this.zoomLevel === 0) {
            return date.toLocaleDateString('ua-UA');
        } else {
            return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        }
    }

    // Метод для масштабирования графика
    public zoom(zoomIn: boolean) {
        if (zoomIn && this.zoomLevel > 0) {
            this.zoomLevel--;
        } else if (!zoomIn && this.zoomLevel < 8) {
            this.zoomLevel++;
        }
        this.render();
    }

    // Метод для прокрутки графика
    public scroll(deltaX: number) {
        const firstBarX = -this.padding;
        const lastBarX = (this.data.length - 1) * (10 + 5) + this.padding; // barWidth + barSpacing + padding

        this.offsetX += deltaX;
        this.offsetX = Math.min(this.offsetX, 0); // не прокручиваем левее первого бара с учетом padding
        this.offsetX = Math.max(this.offsetX, -(lastBarX - this.canvas.width)); // не прокручиваем правее последнего бара с учетом padding
        this.render();
    }
}
