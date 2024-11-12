export class RenderChart {
    constructor(canvas) {
        this.selectedBar = null;
        this.selectedVolumeBarIndex = null;
        // Конфигурационные параметры
        this.config = {
            padding: 30,
            topPadding: 30,
            volumeBarHeight: 30,
            dateLabelHeight: 20,
            barWidth: 10,
            priceScaleWidth: 50,
        };
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.initializeDimensions();
    }
    initializeDimensions() {
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.bottomPadding = this.config.volumeBarHeight + this.config.dateLabelHeight;
        this.leftPadding = this.config.padding;
        this.rightPadding = this.config.padding + this.config.priceScaleWidth;
        this.availableHeight = this.height - this.config.topPadding - this.bottomPadding;
        this.availableWidth = this.width - this.leftPadding - this.rightPadding;
    }
    // Общий метод для установки стилей контекста
    setContextStyles(styles) {
        Object.assign(this.ctx, styles);
    }
    // Метод для отображения баров (разделен на отрисовку теней и тела)
    drawBars(bar, maxPrice, priceRange, barX) {
        const { highY, lowY, barTopY, barHeight } = bar.calculateBarDimensions(maxPrice, priceRange, this.config.topPadding, this.availableHeight);
        this.drawBarShadow(barX, highY, lowY);
        this.drawBarBody(bar, barX, barTopY, barHeight);
    }
    // Подметод для отрисовки тени бара
    drawBarShadow(barX, highY, lowY) {
        this.setContextStyles({ strokeStyle: 'black' });
        this.ctx.beginPath();
        this.ctx.moveTo(barX, highY);
        this.ctx.lineTo(barX, lowY);
        this.ctx.stroke();
    }
    // Подметод для отрисовки тела бара
    drawBarBody(bar, barX, barTopY, barHeight) {
        this.setContextStyles({ fillStyle: bar.getColor() });
        this.ctx.fillRect(barX - this.config.barWidth / 2, barTopY, this.config.barWidth, barHeight);
    }
    // Метод для отображения баров объема
    drawVolumeBars(bar, index, maxVolume, barX) {
        let volumeHeight = Math.max((bar.getTickVolume() / maxVolume) * this.config.volumeBarHeight, 1);
        const volumeY = this.height - this.config.dateLabelHeight - volumeHeight;
        this.setContextStyles({ fillStyle: '#5460cf' });
        this.ctx.fillRect(barX - this.config.barWidth / 2, volumeY, this.config.barWidth, volumeHeight);
        if (this.selectedVolumeBarIndex === index) {
            this.drawVolumeBarLabel(barX, volumeY, bar.getTickVolume());
        }
    }
    // Метод для отображения шкалы цен
    drawPriceScale(maxPrice, priceRange) {
        const numberOfIntervals = 5;
        const priceStep = priceRange / numberOfIntervals;
        const pricePositions = [];
        for (let i = 0; i <= numberOfIntervals; i++) {
            const price = maxPrice - i * priceStep;
            const y = this.config.topPadding + ((maxPrice - price) / priceRange) * this.availableHeight;
            pricePositions.push({ price, y });
        }
        this.setContextStyles({ fillStyle: 'black', font: '10px Arial', textAlign: 'left' });
        this.drawPriceLines(pricePositions, priceRange);
    }
    // Подметод для отрисовки линий на шкале цен
    drawPriceLines(pricePositions, priceRange) {
        pricePositions.forEach(position => {
            this.setContextStyles({ strokeStyle: '#e0e0e0' });
            this.ctx.beginPath();
            this.ctx.moveTo(this.leftPadding, position.y);
            this.ctx.lineTo(this.width - this.rightPadding, position.y);
            this.ctx.stroke();
            const decimalPlaces = this.getDecimalPlaces(priceRange);
            const priceText = position.price.toFixed(decimalPlaces);
            this.ctx.fillText(priceText, this.width - this.config.priceScaleWidth + 5, position.y + 3);
        });
    }
    // Определение количества знаков после запятой
    getDecimalPlaces(priceRange) {
        if (priceRange < 0.1) {
            return 6;
        }
        else if (priceRange < 1) {
            return 4;
        }
        else {
            return 2;
        }
    }
    // Метод для отрисовки выделенного бара
    drawSelectedBarHighlight(maxPrice, priceRange, durationInSeconds) {
        if (!this.selectedBar)
            return;
        const barTopPrice = Math.max(this.selectedBar.getOpen(), this.selectedBar.getClose());
        const lineY = this.config.topPadding + ((maxPrice - barTopPrice) / priceRange) * this.availableHeight;
        this.setContextStyles({ strokeStyle: 'black', lineWidth: 1 });
        this.ctx.beginPath();
        this.ctx.moveTo(0, lineY);
        this.ctx.lineTo(this.width, lineY);
        this.ctx.stroke();
        this.drawSelectedBarLabel(barTopPrice, lineY, durationInSeconds);
    }
    // Подметод для отрисовки плашки над выделенным баром
    drawSelectedBarLabel(barTopPrice, lineY, durationInSeconds) {
        const date = new Date((this.selectedBar.getTime() + durationInSeconds) * 1000);
        const labelLines = [`${barTopPrice}$`, this.formatDate(date), this.formatTime(date)];
        this.setContextStyles({ font: '10px Arial' });
        const labelWidth = Math.max(...labelLines.map(text => this.ctx.measureText(text).width)) + 10;
        const labelHeight = labelLines.length * 12 + 10;
        let labelY = lineY - labelHeight / 2;
        labelY = Math.min(Math.max(labelY, this.config.topPadding), this.height - this.bottomPadding - labelHeight);
        this.drawRoundedRect(this.width - labelWidth, labelY, labelWidth, labelHeight, 5, 'black');
        this.setContextStyles({ fillStyle: 'white', textAlign: 'left' });
        labelLines.forEach((text, index) => {
            this.ctx.fillText(text, this.width - labelWidth + 5, labelY + 15 + index * 12);
        });
    }
    // Метод для отображения шкалы дат и времени
    drawDateScale(firstVisibleBarTime, durationInSec) {
        const { labelCount, includeDate } = this.calculateLabelCount(durationInSec);
        const labelY = this.height - 5;
        const startTime = firstVisibleBarTime; // Начальное время для шкалы
        const intervalInSeconds = durationInSec * 60 * 60; //час
        this.setContextStyles({ fillStyle: 'black', font: '10px Arial' });
        for (let i = 0; i < labelCount; i++) {
            // Позиция X для метки
            const positionX = this.leftPadding + (i * this.availableWidth) / (labelCount - 1);
            // Время для текущей метки, начиная с `firstVisibleBarTime`
            const time = startTime + i * intervalInSeconds;
            const date = new Date(time * 1000);
            const dateString = this.formatLabelDate(date, includeDate);
            this.ctx.fillText(dateString, positionX, labelY);
        }
    }
    // Метод для визначення видимого діапазону та інтервалу
    getVisibleRangeAndInterval(zoomLevel, firstVisibleBarTime, lastVisibleBarTime) {
        const intervals = ['1 day', '12 hours', '6 hours', '3 hours', '1 hour', '30 minutes', '15 minutes', '5 minutes', '1 minute'];
        const currentInterval = intervals[Math.max(0, Math.min(zoomLevel, intervals.length - 1))];
        // Відображення часових діапазонів видимих барів та поточного інтервалу
        const firstDate = new Date(firstVisibleBarTime * 1000);
        const lastDate = new Date(lastVisibleBarTime * 1000);
        const firstDateString = this.formatDateTime(firstDate);
        const lastDateString = this.formatDateTime(lastDate);
        this.ctx.fillStyle = 'black';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left'; // Вирівнювання тексту по лівому краю
        const timeRangeText = `Visible Range: ${firstDateString} - ${lastDateString} (Interval: ${currentInterval})`;
        this.ctx.fillText(timeRangeText, this.leftPadding, 20);
    }
    calculateLabelCount(durationInMinutes) {
        if (durationInMinutes <= 30) {
            return { labelCount: 6, includeDate: false };
        }
        else if (durationInMinutes <= 180) {
            return { labelCount: 5, includeDate: true };
        }
        else if (durationInMinutes <= 720) {
            return { labelCount: 4, includeDate: true };
        }
        else {
            return { labelCount: 3, includeDate: true };
        }
    }
    formatLabelDate(date, includeDate) {
        if (includeDate) {
            return this.formatDateTime(date);
        }
        else {
            return this.formatTime(date);
        }
    }
    // Метод для отображения плашки над выбранным объемным баром
    drawVolumeBarLabel(barX, volumeY, volume) {
        const volumeText = `Trade Volume: ${volume}`;
        // Общие стили для текста
        this.setContextStyles({ font: '10px Arial', textAlign: 'center' });
        // Расчет ширины и высоты плашки
        const labelWidth = this.ctx.measureText(volumeText).width + 10;
        const labelHeight = 20;
        // Позиционирование плашки над объемным блоком
        let labelX = Math.max(barX - labelWidth / 2, this.leftPadding);
        labelX = Math.min(labelX, this.width - this.rightPadding - labelWidth);
        let labelY = volumeY - labelHeight - 5;
        if (labelY < this.config.topPadding) {
            labelY = this.config.topPadding;
        }
        // Отрисовка плашки с закругленными углами
        this.drawRoundedRect(labelX, labelY, labelWidth, labelHeight, 5, '#f0f0f0');
        // Отрисовка текста на плашке
        this.setContextStyles({ fillStyle: 'black' });
        const textX = labelX + labelWidth / 2;
        const textY = labelY + labelHeight / 2 + 3;
        this.ctx.fillText(volumeText, textX, textY);
    }
    drawRoundedRect(x, y, width, height, radius, fillColor) {
        this.setContextStyles({ fillStyle: fillColor });
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
        this.ctx.fill();
    }
    //Подметот для динамічної зміни обраного бару
    updateSelectedBar(bar) {
        this.selectedBar = bar;
        this.selectedVolumeBarIndex = null; // Скидаємо вибраний об'ємний блок
    }
    updateSelectedVolumeBarIndex(index) {
        this.selectedVolumeBarIndex = index;
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
}
