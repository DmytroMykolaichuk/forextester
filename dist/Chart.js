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
        const durationInSeconds = durationInMinutes * 60;
        const groupedBars = [];
        const bars = this.bars;
        if (bars.length === 0) {
            return groupedBars;
        }
        let currentGroup = [];
        let currentGroupStartTime = Math.floor(bars[0].getTime() / durationInSeconds) * durationInSeconds;
        for (const bar of bars) {
            const barTime = bar.getTime();
            if (barTime < currentGroupStartTime + durationInSeconds) {
                currentGroup.push(bar);
            }
            else {
                if (currentGroup.length > 0) {
                    groupedBars.push(this.aggregateBars(currentGroup));
                }
                currentGroup = [bar];
                currentGroupStartTime = Math.floor(barTime / durationInSeconds) * durationInSeconds;
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
        const volumeBarHeight = 30; // Фиксированная высота для объёмов
        const dateLabelHeight = 20; // Высота для меток дат
        const bottomPadding = volumeBarHeight + dateLabelHeight; // Общий нижний отступ
        const availableHeight = height - topPadding - bottomPadding;
        // Добавляем определение длительности бара
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
        const intervals = [
            '1 день',
            '12 часов',
            '6 часов',
            '3 часа',
            '1 час',
            '30 минут',
            '15 минут',
            '5 минут',
            '1 минута'
        ];
        const durationInMinutes = zoomDurations[Math.max(0, Math.min(this.zoomLevel, zoomDurations.length - 1))];
        const durationInSeconds = durationInMinutes * 60;
        const currentInterval = intervals[Math.max(0, Math.min(this.zoomLevel, intervals.length - 1))];
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
        let firstVisibleBarTime = 0;
        let lastVisibleBarTime = 0;
        // Массив для хранения видимых баров
        const visibleBars = [];
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
                // Добавляем бар в массив видимых баров
                visibleBars.push(bar);
                // Устанавливаем времена первого и последнего видимых баров
                if (visibleBars.length === 1) {
                    firstVisibleBarTime = bar.Time;
                }
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
                let volumeHeight = (bar.TickVolume / maxVolume) * volumeBarHeight;
                const minVolumeHeight = 1; // Минимальная высота объёма
                if (volumeHeight < minVolumeHeight) {
                    volumeHeight = minVolumeHeight;
                }
                // Позиция Y для объёма
                const volumeY = height - dateLabelHeight - volumeHeight; // Над метками дат
                // Отрисовка объёма
                this.ctx.fillStyle = 'blue';
                this.ctx.fillRect(barX - barWidth / 2, volumeY, barWidth, volumeHeight);
            }
        });
        // Если нет видимых баров, выходим из метода
        if (visibleBars.length === 0) {
            return;
        }
        // Отображение временного диапазона видимых баров и текущего интервала
        const firstDate = new Date(firstVisibleBarTime * 1000);
        const lastDate = new Date(lastVisibleBarTime * 1000);
        const firstDateString = this.formatDate(firstDate);
        const lastDateString = this.formatDate(lastDate);
        this.ctx.fillStyle = 'black';
        this.ctx.font = '12px Arial';
        const timeRangeText = `Видимый диапазон: ${firstDateString} - ${lastDateString} (Интервал: ${currentInterval})`;
        const textWidth = this.ctx.measureText(timeRangeText).width;
        this.ctx.fillText(timeRangeText, width - textWidth - 10, 20);
        // **Определяем количество меток и формат даты на основе уровня зума**
        let labelCount;
        let includeDate = false;
        if (durationInMinutes <= 30) {
            // 1, 5, 15, 30 минут
            labelCount = 6;
            includeDate = false;
        }
        else if (durationInMinutes <= 180) {
            // 1, 3 часа
            labelCount = 5;
            includeDate = true;
        }
        else if (durationInMinutes <= 720) {
            // 6, 12 часов
            labelCount = 4;
            includeDate = true;
        }
        else {
            // 1 день
            // Вычисляем количество дней между первым и последним видимым баром
            const startDate = new Date(firstVisibleBarTime * 1000);
            const endDate = new Date(lastVisibleBarTime * 1000);
            const dayDifference = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            labelCount = Math.min(dayDifference, 4);
            includeDate = true;
            if (labelCount < 2) {
                labelCount = 2; // Минимум 2 метки для дней
            }
        }
        // Фиксированные позиции для меток дат
        // Настройки текста
        this.ctx.fillStyle = 'black';
        this.ctx.font = '10px Arial';
        const leftPadding = this.padding;
        const rightPadding = this.padding;
        const availableWidth = width - leftPadding - rightPadding;
        const labelY = height - 5; // Позиция Y для меток времени
        for (let i = 0; i < labelCount; i++) {
            let positionX = leftPadding + (i * availableWidth) / (labelCount - 1);
            const time = firstVisibleBarTime + (i * (lastVisibleBarTime - firstVisibleBarTime)) / (labelCount - 1);
            const date = new Date(time * 1000);
            let dateString;
            if (durationInMinutes >= 1440) { // Если интервал 1 день или больше
                dateString = this.formatDate(date);
            }
            else if (includeDate) {
                dateString = this.formatDateTime(date);
            }
            else {
                dateString = this.formatTime(date);
            }
            // Настройка выравнивания текста
            if (i === 0) {
                this.ctx.textAlign = 'left';
            }
            else if (i === labelCount - 1) {
                this.ctx.textAlign = 'right';
            }
            else {
                this.ctx.textAlign = 'center';
            }
            // Отображение метки времени
            this.ctx.fillText(dateString, positionX, labelY);
        }
        // Возвращаем выравнивание текста по умолчанию
        this.ctx.textAlign = 'left';
    }
    // Метод для форматирования даты
    formatDate(date) {
        return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1)
            .toString()
            .padStart(2, '0')}.${date.getFullYear()}`;
    }
    // Метод для форматирования даты и времени
    formatDateTime(date) {
        return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1)
            .toString()
            .padStart(2, '0')}.${date.getFullYear()} ${date
            .getHours()
            .toString()
            .padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    // Метод для форматирования времени
    formatTime(date) {
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
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
