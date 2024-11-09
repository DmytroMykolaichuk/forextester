// Chart.ts
import { Bar } from './Bar';
export class Chart {
    constructor(canvas, dataChunks) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.dataChunks = dataChunks;
        this.bars = [];
        this.offsetX = 0;
        this.zoomLevel = 6;
        this.padding = 30;
        this.offsetXInitialized = false;
        this.totalChartWidth = 0;
        // Обрабатываем данные и формируем общий массив баров
        this.processDataChunks();
    }
    // Метод для обработки чанков данных
    processDataChunks() {
        for (const chunk of this.dataChunks) {
            const chunkStart = chunk.ChunkStart;
            const bars = chunk.Bars.map(barData => {
                // Корректируем время бара, добавляя ChunkStart
                const correctedBarData = {
                    ...barData,
                    Time: barData.Time + chunkStart
                };
                return new Bar(correctedBarData);
            });
            this.bars = this.bars.concat(bars);
        }
        // Сортируем бары по времени
        this.bars.sort((a, b) => a.getTime() - b.getTime());
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
        const bars = this.bars;
        let currentGroup = [];
        let currentGroupStartTime = bars[0].getTime();
        for (const bar of bars) {
            const barTime = bar.getTime();
            if ((barTime - currentGroupStartTime) / 60 < durationInMinutes) {
                currentGroup.push(bar);
            }
            else {
                if (currentGroup.length > 0) {
                    groupedBars.push(this.aggregateBars(currentGroup));
                }
                currentGroup = [bar];
                currentGroupStartTime = barTime;
            }
        }
        // Добавляем последнюю группу
        if (currentGroup.length > 0) {
            groupedBars.push(this.aggregateBars(currentGroup));
        }
        return groupedBars;
    }
    // Метод для агрегации баров в группу
    aggregateBars(bars) {
        const open = bars[0].getOpen();
        const close = bars[bars.length - 1].getClose();
        const high = Math.max(...bars.map(bar => bar.getHigh()));
        const low = Math.min(...bars.map(bar => bar.getLow()));
        const tickVolume = bars.reduce((sum, bar) => sum + bar.getTickVolume(), 0);
        const time = bars[0].getTime();
        return {
            Time: time,
            Open: open,
            High: high,
            Low: low,
            Close: close,
            TickVolume: tickVolume
        };
    }
    // Метод для отображения графика
    render() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        // Очистка canvas
        this.ctx.clearRect(0, 0, width, height);
        // Отрисовка названия графика
        this.ctx.fillStyle = 'black';
        this.ctx.font = '12px Arial';
        this.ctx.fillText(`Data from multiple chunks`, 10, 20);
        const groupedBars = this.groupBarsByZoomLevel();
        // Вычисление максимальной и минимальной цены
        const maxPrice = Math.max(...groupedBars.map(bar => bar.High));
        const minPrice = Math.min(...groupedBars.map(bar => bar.Low));
        let priceRange = maxPrice - minPrice;
        // Обработка случая, когда priceRange равен нулю
        if (priceRange === 0) {
            priceRange = maxPrice * 0.01; // Устанавливаем минимальный диапазон
        }
        // Параметры отрисовки
        const barSpacing = 5;
        const barWidth = 10;
        const topPadding = 30;
        const bottomPadding = 50; // Дополнительное пространство для объёма
        const availableHeight = height - topPadding - bottomPadding;
        // **Добавляем определение длительности бара**
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
        const durationInSeconds = durationInMinutes * 60;
        // Общая ширина графика
        const totalBars = groupedBars.length;
        this.totalChartWidth = totalBars * (barWidth + barSpacing) - barSpacing + this.padding * 2;
        // Смещение по X
        const maxOffsetX = 0;
        const minOffsetX = width - this.totalChartWidth;
        if (!this.offsetXInitialized) {
            if (this.totalChartWidth <= width) {
                this.offsetX = (width - this.totalChartWidth) / 2;
            }
            else {
                this.offsetX = minOffsetX;
            }
            this.offsetXInitialized = true;
        }
        // Максимальный объём для нормализации высоты столбиков объёма
        const maxVolume = Math.max(...groupedBars.map(bar => bar.TickVolume)) || 1; // Избегаем деления на ноль
        // Инициализируем времена первого и последнего видимых баров
        let firstVisibleBarTime = null;
        let lastVisibleBarTime = null;
        groupedBars.forEach((bar, index) => {
            const barX = index * (barWidth + barSpacing) + this.offsetX + this.padding;
            // Координаты Y для бара
            const openY = topPadding + ((maxPrice - bar.Open) / priceRange) * availableHeight;
            const closeY = topPadding + ((maxPrice - bar.Close) / priceRange) * availableHeight;
            const highY = topPadding + ((maxPrice - bar.High) / priceRange) * availableHeight;
            const lowY = topPadding + ((maxPrice - bar.Low) / priceRange) * availableHeight;
            // Определяем верхнюю и нижнюю точки тела бара
            let barTopY = Math.min(openY, closeY);
            let barBottomY = Math.max(openY, closeY);
            // Вычисляем высоту тела бара
            let barHeight = barBottomY - barTopY;
            // Устанавливаем минимальную высоту бара
            const minBarHeight = 1; // Минимальная высота бара в пикселях
            if (barHeight < minBarHeight) {
                barHeight = minBarHeight;
                // Центрируем бар по вертикали между openY и closeY
                const barCenterY = (openY + closeY) / 2;
                barTopY = barCenterY - barHeight / 2;
                barBottomY = barCenterY + barHeight / 2;
            }
            // Проверка видимости бара
            if (barX + barWidth >= 0 && barX - barWidth <= width) {
                // Устанавливаем времена первого и последнего видимых баров
                if (firstVisibleBarTime === null) {
                    firstVisibleBarTime = bar.Time;
                }
                // **Добавляем длительность бара к времени для lastVisibleBarTime**
                lastVisibleBarTime = bar.Time + durationInSeconds;
                // Установка цвета бара
                if (bar.Close > bar.Open) {
                    this.ctx.fillStyle = 'green';
                }
                else if (bar.Close < bar.Open) {
                    this.ctx.fillStyle = 'red';
                }
                else {
                    this.ctx.fillStyle = 'gray';
                }
                // Отрисовка High и Low (тени)
                this.ctx.strokeStyle = 'black';
                this.ctx.beginPath();
                this.ctx.moveTo(barX, highY);
                this.ctx.lineTo(barX, lowY);
                this.ctx.stroke();
                // Отрисовка тела бара
                this.ctx.fillRect(barX - barWidth / 2, barTopY, barWidth, barHeight);
                // Отрисовка объёма под каждой свечой (Tick Volume)
                // Вычисляем высоту объёма с минимальной высотой
                let volumeHeight = (bar.TickVolume / maxVolume) * (bottomPadding - 10);
                const minVolumeHeight = 1; // Минимальная высота объёма
                if (volumeHeight < minVolumeHeight) {
                    volumeHeight = minVolumeHeight;
                }
                // Позиция Y для объёма
                const volumeY = height - volumeHeight - 10; // Отступ в 10 пикселей от нижнего края
                // Отрисовка объёма
                this.ctx.fillStyle = 'blue';
                this.ctx.fillRect(barX - barWidth / 2, volumeY, barWidth, volumeHeight);
            }
        });
        // Отображение временного диапазона видимых баров
        if (firstVisibleBarTime !== null && lastVisibleBarTime !== null) {
            // Преобразуем временные метки в даты
            const firstDate = new Date(firstVisibleBarTime * 1000);
            const lastDate = new Date(lastVisibleBarTime * 1000);
            // Форматируем даты
            const firstDateString = this.formatDate(firstDate);
            const lastDateString = this.formatDate(lastDate);
            // Отображаем временной диапазон
            this.ctx.fillStyle = 'black';
            this.ctx.font = '12px Arial';
            const timeRangeText = `Visible Time Range: ${firstDateString} - ${lastDateString}`;
            const textWidth = this.ctx.measureText(timeRangeText).width;
            this.ctx.fillText(timeRangeText, width - textWidth - 10, 20); // Отображаем в верхнем правом углу
        }
    }
    // Метод для форматирования даты
    formatDate(date) {
        return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1)
            .toString()
            .padStart(2, '0')}.${date.getFullYear()} ${date
            .getHours()
            .toString()
            .padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
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
