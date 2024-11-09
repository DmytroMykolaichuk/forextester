// Chart.ts
import { Bar } from './Bar';
export class Chart {
    constructor(canvas, data, chunkStart) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.data = data.map(barData => new Bar(barData));
        this.offsetX = 0;
        this.chunkStart = chunkStart;
        this.zoomLevel = 6;
        this.padding = 30;
        this.offsetXInitialized = false; // Добавили флаг для инициализации offsetX
        this.totalChartWidth = 0; // Инициализируем общую ширину графика
    }
    // Метод для группировки баров для текущего уровня зума
    groupBarsByZoomLevel() {
        const zoomDurations = [
            24 * 60, // 1 день в минутах
            12 * 60, // 12 часов
            6 * 60, // 6 часов
            3 * 60, // 3 часа
            60, // 1 час
            30, // 30 минут
            15, // 15 минут
            5, // 5 минут
            1 // 1 минута
        ];
        const durationInMinutes = zoomDurations[Math.max(0, Math.min(this.zoomLevel, zoomDurations.length - 1))];
        const groupedBars = [];
        for (let i = 0; i < this.data.length; i += durationInMinutes) {
            const group = this.data.slice(i, i + durationInMinutes);
            if (group.length > 0) {
                const open = group[0].getOpen();
                const close = group[group.length - 1].getClose();
                const high = Math.max(...group.map(bar => bar.getHigh()));
                const low = Math.min(...group.map(bar => bar.getLow()));
                const tickVolume = group.reduce((sum, bar) => sum + bar.getTickVolume(), 0) / group.length;
                groupedBars.push({
                    Time: group[0].getTime() + this.chunkStart,
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
    render() {
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
        const availableHeight = height - 80;
        // Рассчитываем общую ширину графика
        const totalBars = groupedBars.length;
        this.totalChartWidth = totalBars * (barWidth + barSpacing) - barSpacing + this.padding * 2;
        // Вычисляем максимальное и минимальное смещение по X
        const maxOffsetX = 0;
        const minOffsetX = width - this.totalChartWidth;
        // Инициализируем offsetX при первом рендере или после изменения зума
        if (!this.offsetXInitialized) {
            if (this.totalChartWidth <= width) {
                // Если график умещается на холсте, центрируем его
                this.offsetX = (width - this.totalChartWidth) / 2;
            }
            else {
                // Если график больше холста, отображаем последние бары
                this.offsetX = minOffsetX;
            }
            this.offsetXInitialized = true;
        }
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
                }
                else {
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
                const maxVolume = Math.max(...groupedBars.map(bar => bar.TickVolume));
                const volumeHeight = (bar.TickVolume / maxVolume) * 50;
                this.ctx.fillStyle = 'blue';
                this.ctx.fillRect(barX - barWidth / 2, height - volumeHeight - 20, barWidth, volumeHeight);
            }
        });
    }
    // Метод для масштабирования графика
    zoom(zoomIn) {
        if (zoomIn && this.zoomLevel > 0) {
            this.zoomLevel--;
        }
        else if (!zoomIn && this.zoomLevel < 8) {
            this.zoomLevel++;
        }
        this.offsetXInitialized = false; // При зуме нужно пересчитать offsetX
        this.render();
    }
    // Метод для прокрутки графика
    scroll(deltaX) {
        const width = this.canvas.width;
        const maxOffsetX = 0;
        const minOffsetX = width - this.totalChartWidth;
        this.offsetX += deltaX;
        // Ограничиваем прокрутку, чтобы не было пустого пространства
        if (this.totalChartWidth <= width) {
            // Если график умещается на холсте, центрируем его и отключаем прокрутку
            this.offsetX = (width - this.totalChartWidth) / 2;
        }
        else {
            // Если график больше холста, включаем прокрутку
            this.offsetX = Math.min(this.offsetX, maxOffsetX); // Не прокручиваем дальше последних баров
            this.offsetX = Math.max(this.offsetX, minOffsetX); // Не прокручиваем дальше первых баров
        }
        this.render();
    }
}
