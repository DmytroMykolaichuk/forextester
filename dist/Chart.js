// Chart.ts
import { Bar } from './Bar';
import { RenderChart } from './RenderChart';
export class Chart {
    constructor(canvas, dataChunks) {
        this.bars = []; // Оброблений масив барів
        this.visibleBars = []; // Масив видимих барів
        this.offsetX = 0;
        this.zoomLevel = 6;
        this.padding = 30;
        this.barSpacing = 5;
        this.totalChartWidth = 0;
        this.firstVisibleBarTime = 0;
        this.lastVisibleBarTime = 0;
        this.barWidth = 10; // Ширина бару
        this.durationInMinutes = 0; // Продолжительность в минутах для текущего уровня зума
        this.durationInSeconds = 0; // Продолжительность в секундах для текущего уровня зума
        this.maxVolume = 0; // Максимальный объем для видимых баров
        this.zoomDurations = [
            24 * 60, // 1 день в хвилинах
            12 * 60, // 12 годин
            6 * 60, // 6 годин
            3 * 60, // 3 години
            60, // 1 година
            30, // 30 хвилин
            15, // 15 хвилин
            5, // 5 хвилин
            1 // 1 хвилина
        ];
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.dataChunks = dataChunks;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.leftPadding = this.padding;
        this.rightPadding = this.padding + 50;
        this.canvasBoundingRect = this.canvas.getBoundingClientRect();
        this.renderChart = new RenderChart(this.canvas);
        // Обробка чанків даних і формування масиву барів
        this.processDataChunks();
        this.scrollToEnd();
        this.initializeVisibleRange();
        this.canvas.addEventListener('click', this.onCanvasClick.bind(this));
    }
    // Метод для обробки чанків даних і формування масиву барів з обох чанків
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
        // Оновлюємо властивість `bars` і одразу сортуємо для гарантії правильного порядку
        this.bars = allBars.sort((a, b) => a.getTime() - b.getTime());
    }
    // Метод для групування барів на основі рівня зума
    groupBarsByZoomLevel() {
        const durationInSeconds = this.getDurationInMinuteAndSeconds();
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
        // Додаємо останню групу
        if (currentGroup.length > 0) {
            groupedBars.push(this.aggregateBars(currentGroup));
        }
        return groupedBars;
    }
    // Метод для створення нового бару залежно від рівня зума
    aggregateBars(bars) {
        const open = bars[0].getOpen();
        const close = bars[bars.length - 1].getClose();
        const high = Math.max(...bars.map(bar => bar.getHigh()));
        const low = Math.min(...bars.map(bar => bar.getLow()));
        const tickVolume = bars.reduce((sum, bar) => sum + bar.getTickVolume(), 0);
        const time = bars[0].getTime();
        return new Bar({ Time: time, Open: open, High: high, Low: low, Close: close, TickVolume: tickVolume });
    }
    // Метод для вирахування зуму в часі
    getDurationInMinuteAndSeconds() {
        const durationInMinutes = this.zoomDurations[Math.max(0, Math.min(this.zoomLevel, this.zoomDurations.length - 1))];
        const durationInSeconds = durationInMinutes * 60; // Час для групи барів в секундах
        return durationInSeconds;
    }
    initializeVisibleRange() {
        // Группировка баров в зависимости от текущего уровня зума
        const groupedBars = this.groupBarsByZoomLevel();
        // Обновление видимых баров
        this.getVisibleBars(groupedBars);
        // Обновляем `totalChartWidth` в зависимости от количества видимых баров
        this.totalChartWidth = groupedBars.length * (this.barWidth + 5) + this.padding * 2;
    }
    // Метод для вирахування барів в зоні видимості
    getVisibleBars(groupedBars) {
        // Определяем видимые бары на основе текущих настроек масштаба и смещения
        const visibleBars = [];
        // Определяем видимые бары по текущему смещению offsetX
        groupedBars.forEach((bar, index) => {
            const barX = this.offsetX + this.leftPadding + index * (this.barWidth + this.barSpacing);
            // Если бар находится в пределах видимой области, добавляем его в массив видимых баров
            if (barX + this.barWidth > this.leftPadding && barX < this.width - this.rightPadding) {
                visibleBars.push(bar);
            }
        });
        // Если видимые бары найдены, обновляем значения firstVisibleBarTime и lastVisibleBarTime
        if (visibleBars.length > 0) {
            this.firstVisibleBarTime = visibleBars[0].getTime();
            this.lastVisibleBarTime = visibleBars[visibleBars.length - 1].getTime();
        }
        this.visibleBars = visibleBars;
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
    // Метод для відображення графіку
    render() {
        // Очищаем canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        // Группировка баров на основе текущего уровня зума
        const groupedBars = this.groupBarsByZoomLevel();
        // Если нет видимых баров, выходим из метода
        if (this.visibleBars.length === 0)
            return;
        // Определяем максимальные и минимальные цены для видимых баров
        const { maxPrice, priceRange } = this.getPriceRange(this.visibleBars);
        // Рисуем шкалу цен с учетом динамического изменения
        this.renderChart.drawPriceScale(maxPrice, priceRange);
        // Определяем максимальный объем для нормализации высоты объемных блоков
        this.maxVolume = Math.max(...groupedBars.map(bar => bar.getTickVolume())) || 1;
        // Рисуем бары
        this.renderBars(groupedBars, maxPrice, priceRange);
        // Рисуем шкалу дат и времени
        this.renderChart.drawDateScale(this.firstVisibleBarTime, this.durationInMinutes);
        // Рисуем линию и плашку над выбранным баром
        this.renderChart.drawSelectedBarHighlight(maxPrice, priceRange, this.durationInSeconds);
        // Добавить отображение видимого диапазона
        this.renderChart.getVisibleRangeAndInterval(this.zoomLevel, this.firstVisibleBarTime, this.lastVisibleBarTime);
    }
    getPriceRange(visibleBars) {
        // Определяем максимальные и минимальные цены для видимых баров
        const maxPrice = Math.max(...visibleBars.map(bar => bar.getHigh()));
        const minPrice = Math.min(...visibleBars.map(bar => bar.getLow()));
        let priceRange = maxPrice - minPrice;
        // Обработка случая, когда priceRange равен нулю
        if (priceRange === 0) {
            priceRange = maxPrice * 0.01; // Устанавливаем минимальный диапазон
        }
        return { maxPrice, priceRange };
    }
    // Подметод для рендеринга баров и объемов
    renderBars(groupedBars, maxPrice, priceRange) {
        groupedBars.forEach((bar, index) => {
            const barX = this.offsetX + this.leftPadding + index * (this.barWidth + this.barSpacing);
            // Проверка видимости бара
            if (barX + this.barWidth >= this.leftPadding && barX - this.barWidth <= this.width - this.rightPadding) {
                // Рисуем объемные бары
                this.renderChart.drawVolumeBars(bar, index, this.maxVolume, barX);
                // Рисуем основные бары
                this.renderChart.drawBars(bar, maxPrice, priceRange, barX);
            }
        });
    }
    // Метод для масштабування графіка
    zoom(zoomIn) {
        // Сохраняем текущее значение центрального времени (в секундах)
        const centerTime = (this.firstVisibleBarTime + this.lastVisibleBarTime) / 2;
        // Изменяем уровень зума
        if (zoomIn && this.zoomLevel > 0) {
            this.zoomLevel--;
        }
        else if (!zoomIn && this.zoomLevel < this.zoomDurations.length - 1) {
            this.zoomLevel++;
        }
        // Обновляем продолжительность в секундах и минутах для текущего уровня зума
        this.durationInMinutes = this.zoomDurations[this.zoomLevel];
        this.durationInSeconds = this.durationInMinutes * 60;
        // Пересчитываем смещение
        this.setOffsetForCenterTime(centerTime);
        // Сброс выбора объемного блока и пересчет графика
        this.renderChart.updateSelectedVolumeBarIndex(null);
        this.initializeVisibleRange(); // Обновление видимой области
        this.render(); // Перерисовываем график
    }
    setOffsetForCenterTime(centerTime) {
        const groupedBars = this.groupBarsByZoomLevel();
        if (groupedBars.length === 0)
            return;
        // Найти бар, ближайший к центральному времени
        let closestIndex = 0;
        let closestDifference = Math.abs(groupedBars[0].getTime() - centerTime);
        for (let i = 1; i < groupedBars.length; i++) {
            const difference = Math.abs(groupedBars[i].getTime() - centerTime);
            if (difference < closestDifference) {
                closestIndex = i;
                closestDifference = difference;
            }
        }
        // Определяем центральное смещение по оси X
        const width = this.canvas.width;
        const barWidth = this.barWidth;
        const barSpacing = 5;
        const leftPadding = this.padding;
        const rightPadding = this.padding + 50; // Ширина шкалы цен
        const visibleWidth = width - leftPadding - rightPadding;
        const barX = closestIndex * (barWidth + barSpacing);
        this.offsetX = -(barX - visibleWidth / 2);
        // Обеспечение корректных границ для смещения
        const minOffsetX = Math.min(0, width - this.totalChartWidth);
        const maxOffsetX = 0;
        if (this.offsetX > maxOffsetX) {
            this.offsetX = maxOffsetX;
        }
        else if (this.offsetX < minOffsetX) {
            this.offsetX = minOffsetX;
        }
    }
    // Метод для прокручування графіка
    scroll(deltaX) {
        const maxOffsetX = 0;
        const minOffsetX = Math.min(0, this.width - this.totalChartWidth); // Обновленный минимальный сдвиг для корректной прокрутки графика.
        // Обновляем значение offsetX в зависимости от прокрутки
        this.offsetX += deltaX;
        // Ограничиваем смещение так, чтобы график не выходил за края
        if (this.offsetX > maxOffsetX) {
            this.offsetX = maxOffsetX;
        }
        else if (this.offsetX < minOffsetX) {
            this.offsetX = minOffsetX;
        }
        // После изменения смещения необходимо обновить видимые бары и перерисовать график
        this.initializeVisibleRange();
        this.render();
    }
    scrollToEnd() {
        // Группируем бары на основе текущего уровня зума
        const groupedBars = this.groupBarsByZoomLevel();
        if (groupedBars.length === 0) {
            return;
        }
        // Рассчитываем общую ширину графика
        this.totalChartWidth = groupedBars.length * (this.barWidth + 5) + this.padding * 2;
        // Рассчитываем значение смещения так, чтобы последние бары были в зоне видимости
        const width = this.canvas.width;
        const rightPadding = this.padding + 50; // Ширина шкалы цен
        const visibleWidth = width - this.padding - rightPadding;
        // Устанавливаем смещение `offsetX` так, чтобы последние бары были в зоне видимости
        this.offsetX = Math.min(0, visibleWidth - this.totalChartWidth);
    }
    // Обробник кліка по полотну
    onCanvasClick(event) {
        this.canvasBoundingRect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - this.canvasBoundingRect.left;
        const mouseY = event.clientY - this.canvasBoundingRect.top;
        const volumeBarIndex = this.getVolumeBarAtPosition(mouseX, mouseY);
        if (volumeBarIndex !== null) {
            // Клік по об'ємному блоку
            this.renderChart.updateSelectedVolumeBarIndex(volumeBarIndex);
            // Не скидаємо this.selectedBar, щоб лінія та плашка не зникали
            this.render();
        }
        else {
            const bar = this.getBarAtPosition(mouseX, mouseY);
            if (bar) {
                this.renderChart.updateSelectedBar(bar);
                // this.selectedVolumeBarIndex = null; // Скидаємо вибраний об'ємний блок
                this.render();
            }
        }
    }
    // Метод для визначення бару під курсором
    getBarAtPosition(x, y) {
        const height = this.canvas.height;
        // Параметри відображення (повинні співпадати з параметрами в методі render)
        const topPadding = 30;
        const volumeBarHeight = 30;
        const dateLabelHeight = 20;
        const bottomPadding = volumeBarHeight + dateLabelHeight;
        const availableHeight = height - topPadding - bottomPadding;
        // Обчислення maxPrice та minPrice так само, як в render()
        const groupedBars = this.groupBarsByZoomLevel();
        const { maxPrice, priceRange } = this.getPriceRange(this.visibleBars);
        // Перебираємо всі бари та перевіряємо, чи потрапляє координата в область бару
        for (let i = 0; i < groupedBars.length; i++) {
            const bar = groupedBars[i];
            const barX = this.offsetX + this.leftPadding + i * (this.barWidth + this.barSpacing);
            if (x >= barX - this.barWidth / 2 && x <= barX + this.barWidth / 2) {
                // Координати Y для бару
                const highY = topPadding + ((maxPrice - bar.getHigh()) / priceRange) * availableHeight;
                const lowY = topPadding + ((maxPrice - bar.getLow()) / priceRange) * availableHeight;
                if (y >= highY && y <= lowY) {
                    return bar;
                }
            }
        }
        return null;
    }
    // Метод для визначення об'ємного блоку під курсором
    getVolumeBarAtPosition(x, y) {
        const height = this.canvas.height;
        // Параметри відображення (повинні співпадати з параметрами в методі render)
        const volumeBarHeight = 30;
        const dateLabelHeight = 20;
        const leftPadding = this.padding;
        const groupedBars = this.groupBarsByZoomLevel();
        // Перебираємо всі об'ємні блоки та перевіряємо, чи потрапляє координата в область блоку
        for (let i = 0; i < groupedBars.length; i++) {
            const barX = this.offsetX + leftPadding + i * (this.barWidth + this.barSpacing);
            const volumeYStart = height - dateLabelHeight - volumeBarHeight;
            const volumeYEnd = height - dateLabelHeight;
            if (x >= barX - this.barWidth / 2 &&
                x <= barX + this.barWidth / 2 &&
                y >= volumeYStart &&
                y <= volumeYEnd) {
                return i; // Повертаємо індекс об'ємного блоку
            }
        }
        return null;
    }
}
