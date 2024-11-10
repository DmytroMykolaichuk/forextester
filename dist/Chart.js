// Chart.ts
import { Bar } from './Bar';
export class Chart {
    constructor(canvas, dataChunks) {
        this.bars = []; // Обработанный массив баров
        this.offsetX = 0;
        this.zoomLevel = 6;
        this.padding = 30;
        this.offsetXInitialized = false;
        this.totalChartWidth = 0;
        this.selectedBar = null; // Выбранный бар для чёрной линии и плашки
        this.selectedVolumeBarIndex = null; // Индекс выбранного объёмного блока
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.dataChunks = dataChunks;
        this.canvasBoundingRect = this.canvas.getBoundingClientRect();
        // Обрабатываем чанки данных и формируем массив баров
        this.processDataChunks();
        // Добавляем обработчик клика по холсту
        this.canvas.addEventListener('click', this.onCanvasClick.bind(this));
    }
    // Метод для обробки чанков даних и формування масива баров з обох чанков
    processDataChunks() {
        const allBars = [];
        for (let i = 0; i < this.dataChunks.length; i++) {
            const chunk = this.dataChunks[i];
            const chunkStart = chunk.ChunkStart;
            for (let j = 0; j < chunk.Bars.length; j++) {
                const barData = chunk.Bars[j];
                const correctedBarData = {
                    ...barData,
                    Time: barData.Time + chunkStart,
                };
                allBars.push(new Bar(correctedBarData));
            }
        }
        // Обновлюємо властивісь `bars` і відразу сортуємо // сортування на всякий випадако якщо дані будуть не в коректному порядку
        this.bars = allBars.sort((a, b) => a.getTime() - b.getTime());
    }
    // Метод для группировки баров на основе уровня зума
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
        const durationInSeconds = durationInMinutes * 60; //час для групи барів в секундах
        const groupedBars = [];
        if (this.bars.length === 0) {
            return groupedBars;
        }
        let currentGroup = [];
        let currentGroupStartTime = Math.floor(this.bars[0].getTime() / durationInSeconds) * durationInSeconds;
        for (const bar of this.bars) {
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
    // Метод для створення нового бару залежно від рівня zoom
    aggregateBars(bars) {
        const open = bars[0].getOpen();
        const close = bars[bars.length - 1].getClose();
        const high = Math.max(...bars.map(bar => bar.getHigh()));
        const low = Math.min(...bars.map(bar => bar.getLow()));
        const tickVolume = bars.reduce((sum, bar) => sum + bar.getTickVolume(), 0);
        const time = bars[0].getTime();
        return new Bar({
            Time: time,
            Open: open,
            High: high,
            Low: low,
            Close: close,
            TickVolume: tickVolume
        });
    }
    // Метод для отображения графика
    render() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        // Очистка canvas
        this.ctx.clearRect(0, 0, width, height);
        const groupedBars = this.groupBarsByZoomLevel();
        // Если выбранный бар не установлен, по умолчанию выбираем последний видимый бар
        if (!this.selectedBar && groupedBars.length > 0 && this.selectedVolumeBarIndex === null) {
            this.selectedBar = groupedBars[groupedBars.length - 1];
        }
        // Вычисление максимальной и минимальной цены
        const maxPrice = Math.max(...groupedBars.map(bar => bar.getHigh()));
        const minPrice = Math.min(...groupedBars.map(bar => bar.getLow()));
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
        const priceScaleWidth = 50; // Ширина шкалы цен
        const priceScalePadding = 5; // Внутренний отступ для шкалы цен
        const leftPadding = this.padding;
        const rightPadding = this.padding + priceScaleWidth;
        const availableWidth = width - leftPadding - rightPadding;
        const availableHeight = height - topPadding - bottomPadding;
        // Определение длительности бара и текущего интервала
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
            '1 day',
            '12 hours',
            '6 hours',
            '3 hours',
            '1 hour',
            '30 minutes',
            '15 minutes',
            '5 minutes',
            '1 minute'
        ];
        const durationInMinutes = zoomDurations[Math.max(0, Math.min(this.zoomLevel, zoomDurations.length - 1))];
        const durationInSeconds = durationInMinutes * 60;
        const currentInterval = intervals[Math.max(0, Math.min(this.zoomLevel, intervals.length - 1))];
        // Общая ширина графика
        const totalBars = groupedBars.length;
        const totalBarsWidth = totalBars * (barWidth + barSpacing) - barSpacing;
        this.totalChartWidth = totalBarsWidth + leftPadding + rightPadding;
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
        const maxVolume = Math.max(...groupedBars.map(bar => bar.getTickVolume())) || 1; // Избегаем деления на ноль
        // Инициализируем времена первого и последнего видимых баров
        let firstVisibleBarTime = 0;
        let lastVisibleBarTime = 0;
        // Массив для хранения видимых баров
        const visibleBars = [];
        // Параметры шкалы цен
        const numberOfIntervals = 5; // Количество интервалов между ценовыми уровнями
        const numberOfPriceLevels = numberOfIntervals + 1; // Всего ценовых уровней
        // Расчёт шагов по цене и позиции
        const priceStep = priceRange / numberOfIntervals;
        const pricePositions = [];
        for (let i = 0; i <= numberOfIntervals; i++) {
            const price = maxPrice - i * priceStep;
            const y = topPadding + ((maxPrice - price) / priceRange) * availableHeight;
            pricePositions.push({ price, y });
        }
        // Отрисовка горизонтальных линий и шкалы цен
        this.ctx.fillStyle = 'black';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'left';
        pricePositions.forEach(position => {
            // Отрисовка горизонтальной линии
            this.ctx.strokeStyle = '#e0e0e0'; // Светло-серый цвет для линий
            this.ctx.beginPath();
            this.ctx.moveTo(leftPadding, position.y);
            this.ctx.lineTo(width - rightPadding, position.y);
            this.ctx.stroke();
            // Адаптивное количество знаков после запятой
            let decimalPlaces = 2;
            if (priceRange < 1) {
                decimalPlaces = 4;
            }
            else if (priceRange < 0.1) {
                decimalPlaces = 6;
            }
            const priceText = position.price.toFixed(decimalPlaces);
            this.ctx.fillText(priceText, width - priceScaleWidth + priceScalePadding, position.y + 3);
        });
        // Отрисовка баров
        groupedBars.forEach((bar, index) => {
            const barX = this.offsetX + leftPadding + index * (barWidth + barSpacing);
            const { highY, lowY, barTopY, barHeight } = bar.calculateBarDimensions(maxPrice, priceRange, topPadding, availableHeight);
            // Проверка видимости бара
            if (barX + barWidth >= leftPadding && barX - barWidth <= width - rightPadding) {
                // Добавляем бар в массив видимых баров
                visibleBars.push(bar);
                // Устанавливаем времена первого и последнего видимых баров
                if (visibleBars.length === 1) {
                    firstVisibleBarTime = bar.getTime();
                }
                lastVisibleBarTime = bar.getTime() + durationInSeconds;
                // Установка цвета бара
                this.ctx.fillStyle = bar.getColor();
                // Отрисовка High и Low (тени)
                this.ctx.strokeStyle = 'black';
                this.ctx.beginPath();
                this.ctx.moveTo(barX, highY);
                this.ctx.lineTo(barX, lowY);
                this.ctx.stroke();
                // Отрисовка тела бара
                this.ctx.fillRect(barX - barWidth / 2, barTopY, barWidth, barHeight);
                // Отрисовка объёма под каждой свечой (Tick Volume)
                let volumeHeight = (bar.getTickVolume() / maxVolume) * volumeBarHeight;
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
        const firstDateString = this.formatDateTime(firstDate);
        const lastDateString = this.formatDateTime(lastDate);
        this.ctx.fillStyle = 'black';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left'; // Выравнивание текста по левому краю
        const timeRangeText = `Visible Range: ${firstDateString} - ${lastDateString} (Interval: ${currentInterval})`;
        this.ctx.fillText(timeRangeText, this.padding, 20);
        // Определяем количество меток и формат даты на основе уровня зума
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
        this.ctx.fillStyle = 'black';
        this.ctx.font = '10px Arial';
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
        // Отрисовка плашки над выбранным объёмным блоком
        if (this.selectedVolumeBarIndex !== null) {
            const index = this.selectedVolumeBarIndex;
            const bar = groupedBars[index];
            const barX = this.offsetX + leftPadding + index * (barWidth + barSpacing);
            // Позиция Y для объёмного блока
            const volumeHeight = (bar.getTickVolume() / maxVolume) * volumeBarHeight;
            const minVolumeHeight = 1;
            const actualVolumeHeight = Math.max(volumeHeight, minVolumeHeight);
            const volumeY = height - dateLabelHeight - actualVolumeHeight;
            // Подготовка данных для плашки
            const volumeText = `Trade Volume: ${bar.getTickVolume()}`;
            // Устанавливаем шрифт и вычисляем размеры плашки
            this.ctx.font = '10px Arial';
            const labelWidth = this.ctx.measureText(volumeText).width + 10;
            const labelHeight = 20;
            // Позиционирование плашки над объёмным блоком
            let labelX = barX - labelWidth / 2;
            let labelY = volumeY - labelHeight - 5;
            // Убедимся, что плашка не выходит за границы графика
            if (labelX < leftPadding) {
                labelX = leftPadding;
            }
            else if (labelX + labelWidth > width - rightPadding) {
                labelX = width - rightPadding - labelWidth;
            }
            if (labelY < topPadding) {
                labelY = topPadding;
            }
            // Отрисовка плашки с закруглёнными краями
            this.drawRoundedRect(labelX, labelY, labelWidth, labelHeight, 5, '#f0f0f0');
            // Отрисовка текста на плашке
            this.ctx.fillStyle = 'black';
            this.ctx.textAlign = 'center';
            const textX = labelX + labelWidth / 2;
            const textY = labelY + labelHeight / 2 + 3;
            this.ctx.fillText(volumeText, textX, textY);
        }
        // Отрисовка линии и плашки над выбранным баром
        if (this.selectedBar) {
            // Определяем индекс выбранного бара
            const selectedBarIndex = groupedBars.findIndex(bar => bar.getTime() === this.selectedBar.getTime());
            // Координата X выбранного бара
            const barX = this.offsetX + leftPadding + selectedBarIndex * (barWidth + barSpacing);
            // Цена верхней границы тела бара (максимум между Open и Close)
            const barTopPrice = Math.max(this.selectedBar.getOpen(), this.selectedBar.getClose());
            // Координата Y для линии
            const lineY = topPadding + ((maxPrice - barTopPrice) / priceRange) * availableHeight;
            // Отрисовка тонкой чёрной линии через весь график, включая отступы
            this.ctx.strokeStyle = 'black';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(0, lineY);
            this.ctx.lineTo(width, lineY);
            this.ctx.stroke();
            // Подготовка данных для плашки
            const priceText = `${barTopPrice}$`; // Отображаем цену без округления и добавляем символ `$`
            const date = new Date((this.selectedBar.getTime() + durationInSeconds) * 1000);
            const dateText = this.formatDate(date);
            const timeText = this.formatTime(date);
            const labelLines = [priceText, dateText, timeText];
            // Устанавливаем шрифт и вычисляем размеры плашки
            this.ctx.font = '10px Arial';
            const labelWidth = Math.max(...labelLines.map(text => this.ctx.measureText(text).width)) + 10;
            const labelHeight = labelLines.length * 12 + 10; // Высота плашки с учётом количества строк
            // Позиционирование плашки вплотную к правому краю полотна
            const labelX = width - labelWidth; // Позиция на самом краю полотна
            let labelY = lineY - labelHeight / 2;
            // Убедимся, что плашка не выходит за границы графика по вертикали
            if (labelY < topPadding) {
                labelY = topPadding;
            }
            else if (labelY + labelHeight > height - bottomPadding) {
                labelY = height - bottomPadding - labelHeight;
            }
            // Отрисовка плашки с закруглёнными краями
            this.drawRoundedRect(labelX, labelY, labelWidth, labelHeight, 5, 'black');
            // Отрисовка текста на плашке
            this.ctx.fillStyle = 'white';
            this.ctx.textAlign = 'left'; // Выравнивание текста по левому краю
            const textX = labelX + 5;
            const textY = labelY + 15;
            labelLines.forEach((text, index) => {
                this.ctx.fillText(text, textX, textY + index * 12);
            });
        }
    }
    // Метод для форматирования даты
    formatDate(date) {
        return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1)
            .toString()
            .padStart(2, '0')}.${date.getFullYear()}`;
    }
    // Метод для форматирования времени
    formatTime(date) {
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    // Метод для форматирования даты и времени
    formatDateTime(date) {
        return `${this.formatDate(date)} ${this.formatTime(date)}`;
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
        // Устанавливаем выбранный бар на последний бар после изменения зума
        const groupedBars = this.groupBarsByZoomLevel();
        if (groupedBars.length > 1) {
            this.selectedBar = groupedBars[groupedBars.length - 1];
        }
        else {
            this.selectedBar = null;
        }
        this.selectedVolumeBarIndex = null; // Сбрасываем выбранный объёмный блок
        this.render();
    }
    // Метод для прокрутки графика
    scroll(deltaX) {
        const width = this.canvas.width;
        const leftPadding = this.padding;
        const rightPadding = this.padding + 50; // 50 - ширина шкалы цен
        const totalContentWidth = this.totalChartWidth - leftPadding - rightPadding;
        const maxOffsetX = 0;
        const minOffsetX = width - this.totalChartWidth;
        this.offsetX += deltaX;
        // Ограничиваем прокрутку
        if (this.totalChartWidth <= width) {
            this.offsetX = (width - this.totalChartWidth) / 2;
        }
        else {
            this.offsetX = Math.min(this.offsetX, maxOffsetX);
            this.offsetX = Math.max(this.offsetX, minOffsetX);
        }
        this.render();
    }
    // Обработчик клика по холсту
    onCanvasClick(event) {
        this.canvasBoundingRect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - this.canvasBoundingRect.left;
        const mouseY = event.clientY - this.canvasBoundingRect.top;
        const volumeBarIndex = this.getVolumeBarAtPosition(mouseX, mouseY);
        if (volumeBarIndex !== null) {
            // Клик по объёмному блоку
            this.selectedVolumeBarIndex = volumeBarIndex;
            // Не сбрасываем this.selectedBar, чтобы линия и плашка не исчезали
            this.render();
        }
        else {
            const bar = this.getBarAtPosition(mouseX, mouseY);
            if (bar) {
                this.selectedBar = bar;
                this.selectedVolumeBarIndex = null; // Сбрасываем выбранный объёмный блок
                this.render();
            }
        }
    }
    // Метод для определения бара под курсором
    getBarAtPosition(x, y) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        // Параметры отрисовки (должны совпадать с параметрами в методе render)
        const barSpacing = 5;
        const barWidth = 10;
        const topPadding = 30;
        const volumeBarHeight = 30;
        const dateLabelHeight = 20;
        const bottomPadding = volumeBarHeight + dateLabelHeight;
        const priceScaleWidth = 50;
        const leftPadding = this.padding;
        const rightPadding = this.padding + priceScaleWidth;
        const availableHeight = height - topPadding - bottomPadding;
        // Вычисление maxPrice и minPrice так же, как в render()
        const groupedBars = this.groupBarsByZoomLevel();
        const maxPrice = Math.max(...groupedBars.map(bar => bar.getHigh()));
        const minPrice = Math.min(...groupedBars.map(bar => bar.getLow()));
        let priceRange = maxPrice - minPrice;
        if (priceRange === 0) {
            priceRange = maxPrice * 0.01;
        }
        // Проходим по всем барам и проверяем, попадает ли координата в область бара
        for (let i = 0; i < groupedBars.length; i++) {
            const bar = groupedBars[i];
            const barX = this.offsetX + leftPadding + i * (barWidth + barSpacing);
            if (x >= barX - barWidth / 2 && x <= barX + barWidth / 2) {
                // Координаты Y для бара
                const highY = topPadding + ((maxPrice - bar.getHigh()) / priceRange) * availableHeight;
                const lowY = topPadding + ((maxPrice - bar.getLow()) / priceRange) * availableHeight;
                if (y >= highY && y <= lowY) {
                    return bar;
                }
            }
        }
        return null;
    }
    // Метод для определения объёмного блока под курсором
    getVolumeBarAtPosition(x, y) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        // Параметры отрисовки (должны совпадать с параметрами в методе render)
        const barSpacing = 5;
        const barWidth = 10;
        const volumeBarHeight = 30;
        const dateLabelHeight = 20;
        const bottomPadding = volumeBarHeight + dateLabelHeight;
        const priceScaleWidth = 50;
        const leftPadding = this.padding;
        const rightPadding = this.padding + priceScaleWidth;
        const groupedBars = this.groupBarsByZoomLevel();
        // Проходим по всем объёмным блокам и проверяем, попадает ли координата в область блока
        for (let i = 0; i < groupedBars.length; i++) {
            const barX = this.offsetX + leftPadding + i * (barWidth + barSpacing);
            const volumeYStart = height - dateLabelHeight - volumeBarHeight;
            const volumeYEnd = height - dateLabelHeight;
            if (x >= barX - barWidth / 2 &&
                x <= barX + barWidth / 2 &&
                y >= volumeYStart &&
                y <= volumeYEnd) {
                return i; // Возвращаем индекс объёмного блока
            }
        }
        return null;
    }
    // Метод для отрисовки прямоугольника с закруглёнными краями
    drawRoundedRect(x, y, width, height, radius, fillColor) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
        this.ctx.fillStyle = fillColor;
        this.ctx.fill();
    }
}
