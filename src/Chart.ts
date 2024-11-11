// Chart.ts
import { Bar } from './Bar';

export class Chart {
    public canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private dataChunks: DataChunk[]; // Масив чанків даних
    private bars: Bar[] = []; // Оброблений масив барів
    private visibleBars: Bar[] = []; // Масив видимих барів
    private offsetX: number = 0;
    private zoomLevel: number = 6;
    private padding: number = 30;
    private totalChartWidth: number = 0;
    private selectedBar: Bar | null = null; // Вибраний бар для чорної лінії та плашки
    private selectedVolumeBarIndex: number | null = null; // Індекс вибраного блоку об'єму торгівлі
    private canvasBoundingRect: DOMRect; // Для отримання позиції полотна на сторінці
    private firstVisibleBarTime: number = 0;
    private lastVisibleBarTime: number = 0;
    private barWidth: number = 10; // Ширина бару
    private durationInMinutes: number = 0;  // Продолжительность в минутах для текущего уровня зума
    private durationInSeconds: number = 0;  // Продолжительность в секундах для текущего уровня зума
    private maxVolume: number = 0;          // Максимальный объем для видимых баров
    private zoomDurations: number[] = [
        24 * 60, // 1 день в хвилинах
        12 * 60, // 12 годин
        6 * 60,  // 6 годин
        3 * 60,  // 3 години
        60,      // 1 година
        30,      // 30 хвилин
        15,      // 15 хвилин
        5,       // 5 хвилин
        1        // 1 хвилина
    ];

    constructor(canvas: HTMLCanvasElement, dataChunks: DataChunk[]) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.dataChunks = dataChunks;
        this.canvasBoundingRect = this.canvas.getBoundingClientRect();
        // Обробка чанків даних і формування масиву барів
        this.processDataChunks();
        this.scrollToEnd();
        this.canvas.addEventListener('click', this.onCanvasClick.bind(this));
    }

    // Метод для обробки чанків даних і формування масиву барів з обох чанків
    private processDataChunks() {
        const allBars: Bar[] = [];
    
        for (let i = 0; i < this.dataChunks.length; i++) {
            const chunk = this.dataChunks[i];
            const chunkStart = chunk.ChunkStart;
    
            for (let j = 0; j < chunk.Bars.length; j++) {
                const barData = chunk.Bars[j];
                const correctedBarData: BarData = {
                    ...barData,
                    Time: barData.Time + chunkStart,
                };
                allBars.push(new Bar(correctedBarData));
            }
        }

        // Оновлюємо властивість `bars` і одразу сортуємо для гарантії правильного порядку
        this.bars = allBars.sort((a, b) => a.getTime() - b.getTime());

        // После обработки данных инициализируем видимый диапазон и отрисовываем график
        this.initializeVisibleRange();
    }

    // Метод для групування барів на основі рівня зума
    private groupBarsByZoomLevel(): Bar[] {
        const durationInMinutes = this.zoomDurations[Math.max(0, Math.min(this.zoomLevel, this.zoomDurations.length - 1))];
        const durationInSeconds = durationInMinutes * 60; // Час для групи барів в секундах

        const groupedBars: Bar[] = [];

        if (this.bars.length === 0) {
            return groupedBars;
        }

        let currentGroup: Bar[] = [];
        let currentGroupStartTime = Math.floor(this.bars[0].getTime() / durationInSeconds) * durationInSeconds;
        
        for (const bar of this.bars) {
            const barTime = bar.getTime();
            
            if (barTime < currentGroupStartTime + durationInSeconds) {
                currentGroup.push(bar);
            } else {
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
    private aggregateBars(bars: Bar[]): Bar {
        const open = bars[0].getOpen();
        const close = bars[bars.length - 1].getClose();
        const high = Math.max(...bars.map(bar => bar.getHigh()));
        const low = Math.min(...bars.map(bar => bar.getLow()));
        const tickVolume = bars.reduce((sum, bar) => sum + bar.getTickVolume(), 0);
        const time = bars[0].getTime();

        return new Bar({ Time: time, Open: open, High: high, Low: low, Close: close, TickVolume: tickVolume });
    }

    public initializeVisibleRange(): void {
        // Группировка баров в зависимости от текущего уровня зума
        const groupedBars = this.groupBarsByZoomLevel();
    
        // Обновление видимых баров
        this.getVisibleBars(groupedBars);
    
        // Обновляем `totalChartWidth` в зависимости от количества видимых баров
        this.totalChartWidth = groupedBars.length * (this.barWidth + 5) + this.padding * 2;
    }
    

    public getVisibleBars(groupedBars: Bar[]): void {
        // Определяем видимые бары на основе текущих настроек масштаба и смещения
        const visibleBars: Bar[] = [];
        
        const width = this.canvas.width;
        const barWidth = 10;
        const barSpacing = 5;
        const leftPadding = this.padding;
        const rightPadding = this.padding + 50; // 50 - ширина шкалы цен
    
        // Определяем видимые бары по текущему смещению offsetX
        groupedBars.forEach((bar, index) => {
            const barX = this.offsetX + leftPadding + index * (barWidth + barSpacing);
    
            // Если бар находится в пределах видимой области, добавляем его в массив видимых баров
            if (barX + barWidth > leftPadding && barX < width - rightPadding) {
                visibleBars.push(bar);
            }
        });
    
        // Если видимые бары найдены, обновляем значения firstVisibleBarTime и lastVisibleBarTime
        if (visibleBars.length > 0) {
            this.firstVisibleBarTime = visibleBars[0].getTime();
            this.lastVisibleBarTime = visibleBars[visibleBars.length - 1].getTime();
        } else {
            // Если видимых баров нет, обнуляем время видимых баров
            this.firstVisibleBarTime = 0;
            this.lastVisibleBarTime = 0;
        }
        this.visibleBars = visibleBars;
    }
    

    //Метод для відображення чорної лінії та плашки над вибраним баром
    private drawSelectedBarHighlight(groupedBars: Bar[], maxPrice: number, priceRange: number, topPadding: number, availableHeight: number, width: number, durationInSeconds: number, bottomPadding: number) {
            if (this.selectedBar) {
                // Визначення індексу вибраного бару
                const selectedBarIndex = groupedBars.findIndex(bar => bar.getTime() === this.selectedBar!.getTime());
    
                // Координата X вибраного бару
                const barX = this.offsetX + this.padding + selectedBarIndex * (10 + 5); // barWidth + barSpacing
    
                // Ціна верхньої границі тіла бару (максимум між Open та Close)
                const barTopPrice = Math.max(this.selectedBar.getOpen(), this.selectedBar.getClose());
    
                // Координата Y для лінії
                const lineY = topPadding + ((maxPrice - barTopPrice) / priceRange) * availableHeight;
    
                // Відображення тонкої чорної лінії через весь графік, включаючи відступи
                this.ctx.strokeStyle = 'black';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(0, lineY);
                this.ctx.lineTo(width, lineY);
                this.ctx.stroke();
    
                // Підготовка даних для плашки
                const priceText = `${barTopPrice}$`; // Відображення ціни без округлення та додаємо символ `$`
                const date = new Date((this.selectedBar.getTime() + durationInSeconds) * 1000);
                const dateText = this.formatDate(date);
                const timeText = this.formatTime(date);
    
                const labelLines = [priceText, dateText, timeText];
    
                // Встановлюємо шрифт і розраховуємо розміри плашки
                this.ctx.font = '10px Arial';
                const labelWidth = Math.max(...labelLines.map(text => this.ctx.measureText(text).width)) + 10;
                const labelHeight = labelLines.length * 12 + 10; // Висота плашки з урахуванням кількості рядків
    
                // Позиціювання плашки щільно до правого краю полотна
                const labelX = width - labelWidth; // Позиція на самому краю полотна
                let labelY = lineY - labelHeight / 2;
    
                // Переконуємось, що плашка не виходить за межі графіка по вертикалі
                if (labelY < topPadding) {
                    labelY = topPadding;
                } else if (labelY + labelHeight > this.canvas.height - bottomPadding) {
                    labelY = this.canvas.height - bottomPadding - labelHeight;
                }
    
                // Відображення плашки із заокругленими краями
                this.drawRoundedRect(labelX, labelY, labelWidth, labelHeight, 5, 'black');
    
                // Відображення тексту на плашці
                this.ctx.fillStyle = 'white';
                this.ctx.textAlign = 'left'; // Вирівнювання тексту по лівому краю
                const textX = labelX + 5;
                const textY = labelY + 15;
    
                labelLines.forEach((text, index) => {
                    this.ctx.fillText(text, textX, textY + index * 12);
                });
            }
    }

    // Метод для відображення блоків об'єму торгвілі під свічками
    private drawVolumeBars(bar: Bar, maxVolume: number, volumeBarHeight: number, barWidth: number,  height: number, dateLabelHeight: number, barX: number) {
        // Відображення об'єму під кожною свічкою (Tick Volume)
        let volumeHeight = (bar.getTickVolume() / maxVolume) * volumeBarHeight;
        const minVolumeHeight = 1; // Мінімальна висота об'єму
        if (volumeHeight < minVolumeHeight) {
            volumeHeight = minVolumeHeight;
        }

        // Позиція Y для об'єму
        const volumeY = height - dateLabelHeight - volumeHeight; // Над мітками дат

        // Відображення об'єму
        this.ctx.fillStyle = 'blue';
        this.ctx.fillRect(barX - barWidth / 2, volumeY, barWidth, volumeHeight);
    }

    // Метод для відображення барів (червоних і зелених)
    private drawBars(bar: Bar, maxPrice: number, priceRange: number, topPadding: number, availableHeight: number, barWidth: number, barX: number) {
                const { highY, lowY, barTopY, barHeight } = bar.calculateBarDimensions(maxPrice, priceRange, topPadding, availableHeight); 
                // Встановлення кольору бару
                this.ctx.fillStyle = bar.getColor();
        
                // Відображення High та Low (тіні)
                this.ctx.strokeStyle = 'black';
                this.ctx.beginPath();
                this.ctx.moveTo(barX, highY);
                this.ctx.lineTo(barX, lowY);
                this.ctx.stroke();
        
                // Відображення тіла бару
                this.ctx.fillRect(barX - barWidth / 2, barTopY, barWidth, barHeight);
    }

    // Метод для відображення шкали цін
    private drawPriceScale(maxPrice: number, priceRange: number, availableHeight: number, leftPadding: number, rightPadding: number, topPadding: number, width: number, priceScaleWidth: number) {
        const numberOfIntervals = 5; // Количество интервалов на шкале цен
        const priceStep = priceRange / numberOfIntervals;
        const priceScalePadding = 5; // Внутренний отступ для шкалы цен
    
        const pricePositions: PricePosition[] = [];
    
        for (let i = 0; i <= numberOfIntervals; i++) {
            const price = maxPrice - i * priceStep;
            const y = topPadding + ((maxPrice - price) / priceRange) * availableHeight;
            pricePositions.push({ price, y });
        }
    
        // Рисуем горизонтальные линии и шкалу цен
        this.ctx.fillStyle = 'black';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'left';
    
        pricePositions.forEach(position => {
            // Отображение горизонтальной линии
            this.ctx.strokeStyle = '#e0e0e0'; // Светло-серый цвет линий
            this.ctx.beginPath();
            this.ctx.moveTo(leftPadding, position.y);
            this.ctx.lineTo(width - rightPadding, position.y);
            this.ctx.stroke();
    
            // Определение количества знаков после запятой в зависимости от priceRange
            let decimalPlaces = 2;
            if (priceRange < 1) {
                decimalPlaces = 4;
            } else if (priceRange < 0.1) {
                decimalPlaces = 6;
            }
    
            const priceText = position.price.toFixed(decimalPlaces);
            this.ctx.fillText(priceText, width - priceScaleWidth + priceScalePadding, position.y + 3);
        });
    }

// Метод для відображення шкали дат і часу
private drawDateScale(durationInMinutes: number, leftPadding: number, height: number, availableWidth: number) {
    // Определяем количество меток и необходимость включения даты в зависимости от уровня зума
    const { labelCount, includeDate } = this.calculateLabelCount(durationInMinutes);

    // Позиция Y для меток времени
    const labelY = height - 5;

    // Установка стиля текста
    this.ctx.fillStyle = 'black';
    this.ctx.font = '10px Arial';

    for (let i = 0; i < labelCount; i++) {
        const positionX = leftPadding + (i * availableWidth) / (labelCount - 1);
        const time = this.firstVisibleBarTime + (i * (this.lastVisibleBarTime - this.firstVisibleBarTime)) / (labelCount - 1);
        const date = new Date(time * 1000);

        // Определяем строку для отображения в зависимости от длительности интервала
        const dateString = this.formatLabelDate(date, durationInMinutes, includeDate);

        // Устанавливаем выравнивание текста для первой, последней и промежуточных меток
        this.ctx.textAlign = this.getTextAlignment(i, labelCount);

        // Отображение метки времени
        this.ctx.fillText(dateString, positionX, labelY);
    }
}
// Метод для расчета количества меток и необходимости включения даты в зависимости от длительности интервала
private calculateLabelCount(durationInMinutes: number): { labelCount: number, includeDate: boolean } {
    if (durationInMinutes <= 30) {
        return { labelCount: 6, includeDate: false };
    } else if (durationInMinutes <= 180) {
        return { labelCount: 5, includeDate: true };
    } else if (durationInMinutes <= 720) {
        return { labelCount: 4, includeDate: true };
    } else {
        // Определяем количество дней между первым и последним видимым баром
        const startDate = new Date(this.firstVisibleBarTime * 1000);
        const endDate = new Date(this.lastVisibleBarTime * 1000);
        const dayDifference = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const labelCount = Math.max(2, Math.min(dayDifference, 4)); // Минимум 2 метки

        return { labelCount, includeDate: true };
    }
}
// Метод для форматирования даты метки в зависимости от длительности интервала
private formatLabelDate(date: Date, durationInMinutes: number, includeDate: boolean): string {
    if (durationInMinutes >= 1440) {
        return this.formatDate(date); // Форматирование только даты
    } else if (includeDate) {
        return this.formatDateTime(date); // Форматирование даты и времени
    } else {
        return this.formatTime(date); // Форматирование только времени
    }
}
// Метод для получения выравнивания текста
private getTextAlignment(index: number, labelCount: number): CanvasTextAlign {
    if (index === 0) {
        return 'left';
    } else if (index === labelCount - 1) {
        return 'right';
    } else {
        return 'center';
    }
}
// Метод для форматування дати
private formatDate(date: Date): string {
    return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1)
        .toString()
        .padStart(2, '0')}.${date.getFullYear()}`;
}
// Метод для форматування часу
private formatTime(date: Date): string {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}
// Метод для форматування дати та часу
private formatDateTime(date: Date): string {
    return `${this.formatDate(date)} ${this.formatTime(date)}`;
}

    // Метод для визначення видимого діапазону та інтервалу
    private getVisibleRangeAndInterval(): void {
        const intervals = ['1 day', '12 hours', '6 hours', '3 hours', '1 hour', '30 minutes', '15 minutes', '5 minutes', '1 minute'];
        this.durationInMinutes = this.zoomDurations[Math.max(0, Math.min(this.zoomLevel, this.zoomDurations.length - 1))];
        this.durationInSeconds = this.durationInMinutes * 60;
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
        this.ctx.fillText(timeRangeText, this.padding, 20);
    }


// Метод для відображення плашки над вибраним об'ємним блоком
private drawVolumeBarLabel(groupedBars: Bar[], leftPadding: number, width: number, barWidth: number, barSpacing: number, volumeBarHeight: number, dateLabelHeight: number, topPadding: number, maxVolume: number, height: number) {
    if (this.selectedVolumeBarIndex !== null) {
        const index = this.selectedVolumeBarIndex;
        const bar = groupedBars[index];

        const barX = this.offsetX + leftPadding + index * (barWidth + barSpacing);

        // Позиція Y для об'ємного блоку
        const volumeHeight = (bar.getTickVolume() / maxVolume) * volumeBarHeight;
        const minVolumeHeight = 1;
        const actualVolumeHeight = Math.max(volumeHeight, minVolumeHeight);

        const volumeY = height - dateLabelHeight - actualVolumeHeight;

        // Підготовка даних для плашки
        const volumeText = `Trade Volume: ${bar.getTickVolume()}`;

        // Встановлюємо шрифт і розраховуємо розміри плашки
        this.ctx.font = '10px Arial';
        const labelWidth = this.ctx.measureText(volumeText).width + 10;
        const labelHeight = 20;

        // Позиціювання плашки над об'ємним блоком
        let labelX = barX - labelWidth / 2;
        let labelY = volumeY - labelHeight - 5;

        // Переконуємось, що плашка не виходить за межі графіка
        const rightPadding = this.padding + 50; // 50 - ширина шкали цін
        if (labelX < leftPadding) {
            labelX = leftPadding;
        } else if (labelX + labelWidth > width - rightPadding) {
            labelX = width - rightPadding - labelWidth;
        }
        if (labelY < topPadding) {
            labelY = topPadding;
        }

        // Відображення плашки із заокругленими краями
        this.drawRoundedRect(labelX, labelY, labelWidth, labelHeight, 5, '#f0f0f0');

        // Відображення тексту на плашці
        this.ctx.fillStyle = 'black';
        this.ctx.textAlign = 'center';
        const textX = labelX + labelWidth / 2;
        const textY = labelY + labelHeight / 2 + 3;

        this.ctx.fillText(volumeText, textX, textY);
    }
}

    // Метод для відображення графіку
    public render() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const barSpacing = 5;
        const barWidth = this.barWidth;
        const topPadding = 30;
        const volumeBarHeight = 30;
        const dateLabelHeight = 20;
        const bottomPadding = volumeBarHeight + dateLabelHeight;
        const priceScaleWidth = 50;
        const leftPadding = this.padding;
        const rightPadding = this.padding + priceScaleWidth;
        const availableWidth = width - leftPadding - rightPadding;
        const availableHeight = height - topPadding - bottomPadding;
    
        // Очищаем canvas
        this.ctx.clearRect(0, 0, width, height);
    
        // Группировка баров на основе текущего уровня зума
        const groupedBars = this.groupBarsByZoomLevel();
    
        // Обновляем массив видимых баров
        this.getVisibleBars(groupedBars);
    
        // Если нет видимых баров, выходим из метода
        if (this.visibleBars.length === 0) return;
    
        // Определяем максимальные и минимальные цены для видимых баров
        const maxPrice = Math.max(...this.visibleBars.map(bar => bar.getHigh()));
        const minPrice = Math.min(...this.visibleBars.map(bar => bar.getLow()));
        let priceRange = maxPrice - minPrice;
    
        // Обработка случая, когда priceRange равен нулю
        if (priceRange === 0) {
            priceRange = maxPrice * 0.01; // Устанавливаем минимальный диапазон
        }
    
        // Рисуем шкалу цен с учетом динамического изменения
        this.drawPriceScale(maxPrice, priceRange, availableHeight, leftPadding, rightPadding, topPadding, width, priceScaleWidth);
    
        // Определяем максимальный объем для нормализации высоты объемных блоков
        this.maxVolume = Math.max(...groupedBars.map(bar => bar.getTickVolume())) || 1;
    
        // Рисуем бары
        groupedBars.forEach((bar, index) => {
            const barX = this.offsetX + leftPadding + index * (barWidth + barSpacing);
    
            // Проверка видимости бара
            if (barX + barWidth >= leftPadding && barX - barWidth <= width - rightPadding) {
                // Добавляем бар в массив видимых баров
                this.visibleBars.push(bar);
    
                // Рисуем объемные бары
                this.drawVolumeBars(bar, this.maxVolume, volumeBarHeight, barWidth, height, dateLabelHeight, barX);
    
                // Рисуем основные бары
                this.drawBars(bar, maxPrice, priceRange, topPadding, availableHeight, barWidth, barX);
            }
        });
    
        // Устанавливаем время первого и последнего видимых баров
        this.firstVisibleBarTime = this.visibleBars[0].getTime();
        this.lastVisibleBarTime = this.visibleBars[this.visibleBars.length - 1].getTime();
    
        // Рисуем шкалу дат и времени
        if (this.firstVisibleBarTime !== 0 && this.lastVisibleBarTime !== 0) {
            this.drawDateScale(this.durationInMinutes, leftPadding, height, availableWidth);
        }
    
        // Рисуем плашку над выбранным объемным блоком
        this.drawVolumeBarLabel(groupedBars, leftPadding, width, barWidth, barSpacing, volumeBarHeight, dateLabelHeight, topPadding, this.maxVolume, height);
    
        // Рисуем линию и плашку над выбранным баром
        this.drawSelectedBarHighlight(groupedBars, maxPrice, priceRange, topPadding, availableHeight, width, this.durationInSeconds, bottomPadding);
    
        // Добавить отображение видимого диапазона
        this.getVisibleRangeAndInterval(); // Добавление этой строки
    }


    // Метод для масштабування графіка
    public zoom(zoomIn: boolean) {
        // Сохраняем текущее значение центрального времени (в секундах)
        const centerTime = (this.firstVisibleBarTime + this.lastVisibleBarTime) / 2;
    
        // Изменяем уровень зума
        if (zoomIn && this.zoomLevel > 0) {
            this.zoomLevel--;
        } else if (!zoomIn && this.zoomLevel < this.zoomDurations.length - 1) {
            this.zoomLevel++;
        }
    
        // Обновляем продолжительность в секундах и минутах для текущего уровня зума
        this.durationInMinutes = this.zoomDurations[this.zoomLevel];
        this.durationInSeconds = this.durationInMinutes * 60;
    
        // Пересчитываем смещение
        this.setOffsetForCenterTime(centerTime);
    
        // Сброс выбора объемного блока и пересчет графика
        this.selectedVolumeBarIndex = null;
        this.initializeVisibleRange(); // Обновление видимой области
        this.render(); // Перерисовываем график
    }

    private setOffsetForCenterTime(centerTime: number): void {
        const groupedBars = this.groupBarsByZoomLevel();
    
        if (groupedBars.length === 0) return;
    
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
        } else if (this.offsetX < minOffsetX) {
            this.offsetX = minOffsetX;
        }
    }

    // Метод для прокручування графіка
    public scroll(deltaX: number) {
        const width = this.canvas.width;
        const maxOffsetX = 0;
        const minOffsetX = Math.min(0, width - this.totalChartWidth); // Обновленный минимальный сдвиг для корректной прокрутки графика.
    
        // Обновляем значение offsetX в зависимости от прокрутки
        this.offsetX += deltaX;
    
        // Ограничиваем смещение так, чтобы график не выходил за края
        if (this.offsetX > maxOffsetX) {
            this.offsetX = maxOffsetX;
        } else if (this.offsetX < minOffsetX) {
            this.offsetX = minOffsetX;
        }
    
        // После изменения смещения необходимо обновить видимые бары и перерисовать график
        this.initializeVisibleRange();
        this.render();
    }

    private scrollToEnd(): void {
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
    private onCanvasClick(event: MouseEvent) {
        this.canvasBoundingRect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - this.canvasBoundingRect.left;
        const mouseY = event.clientY - this.canvasBoundingRect.top;
    
        const volumeBarIndex = this.getVolumeBarAtPosition(mouseX, mouseY);
        if (volumeBarIndex !== null) {
            // Клік по об'ємному блоку
            this.selectedVolumeBarIndex = volumeBarIndex;
            // Не скидаємо this.selectedBar, щоб лінія та плашка не зникали
            this.render();
        } else {
            const bar = this.getBarAtPosition(mouseX, mouseY);
            if (bar) {
                this.selectedBar = bar;
                this.selectedVolumeBarIndex = null; // Скидаємо вибраний об'ємний блок
                this.render();
            }
        }
    }
    

    // Метод для визначення бару під курсором
    private getBarAtPosition(x: number, y: number): Bar | null {
        const height = this.canvas.height;

        // Параметри відображення (повинні співпадати з параметрами в методі render)
        const barSpacing = 5;
        const barWidth = 10;
        const topPadding = 30;
        const volumeBarHeight = 30;
        const dateLabelHeight = 20;
        const bottomPadding = volumeBarHeight + dateLabelHeight;
        const leftPadding = this.padding;
        const availableHeight = height - topPadding - bottomPadding;

        // Обчислення maxPrice та minPrice так само, як в render()
        const groupedBars = this.groupBarsByZoomLevel();
        const maxPrice = Math.max(...this.visibleBars.map(bar => bar.getHigh()));
        const minPrice = Math.min(...this.visibleBars.map(bar => bar.getLow()));
        let priceRange = maxPrice - minPrice;
        if (priceRange === 0) {
            priceRange = maxPrice * 0.01;
        }

        // Перебираємо всі бари та перевіряємо, чи потрапляє координата в область бару
        for (let i = 0; i < groupedBars.length; i++) {
            const bar = groupedBars[i];
            const barX = this.offsetX + leftPadding + i * (barWidth + barSpacing);

            if (x >= barX - barWidth / 2 && x <= barX + barWidth / 2) {
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
    private getVolumeBarAtPosition(x: number, y: number): number | null {
        const height = this.canvas.height;

        // Параметри відображення (повинні співпадати з параметрами в методі render)
        const barSpacing = 5;
        const barWidth = 10;
        const volumeBarHeight = 30;
        const dateLabelHeight = 20;
        const leftPadding = this.padding;

        const groupedBars = this.groupBarsByZoomLevel();

        // Перебираємо всі об'ємні блоки та перевіряємо, чи потрапляє координата в область блоку
        for (let i = 0; i < groupedBars.length; i++) {
            const barX = this.offsetX + leftPadding + i * (barWidth + barSpacing);

            const volumeYStart = height - dateLabelHeight - volumeBarHeight;
            const volumeYEnd = height - dateLabelHeight;

            if (
                x >= barX - barWidth / 2 &&
                x <= barX + barWidth / 2 &&
                y >= volumeYStart &&
                y <= volumeYEnd
            ) {
                return i; // Повертаємо індекс об'ємного блоку
            }
        }

        return null;
    }

    // Метод для відображення прямокутника із заокругленими краями
    private drawRoundedRect(x: number, y: number, width: number, height: number, radius: number, fillColor: string) {
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