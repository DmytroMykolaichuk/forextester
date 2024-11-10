// Chart.ts
import { Bar } from './Bar';

export class Chart {
    public canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private dataChunks: DataChunk[]; // Масив чанків даних
    private bars: Bar[] = []; // Оброблений масив барів
    private offsetX: number = 0;
    private zoomLevel: number = 6;
    private padding: number = 30;
    private offsetXInitialized: boolean = false;
    private totalChartWidth: number = 0;
    private selectedBar: Bar | null = null; // Вибраний бар для чорної лінії та плашки
    private selectedVolumeBarIndex: number | null = null; // Індекс вибраного об'ємного блоку
    private canvasBoundingRect: DOMRect; // Для отримання позиції полотна на сторінці

    constructor(canvas: HTMLCanvasElement, dataChunks: DataChunk[]) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.dataChunks = dataChunks;
        this.canvasBoundingRect = this.canvas.getBoundingClientRect();
        // Обробка чанків даних і формування масиву барів
        this.processDataChunks();
        // Додаємо обробник кліка по полотну
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
    }

    // Метод для групування барів на основі рівня зума
    private groupBarsByZoomLevel(): Bar[] {
        const zoomDurations = [
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

        const durationInMinutes = zoomDurations[Math.max(0, Math.min(this.zoomLevel, zoomDurations.length - 1))];
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

        return new Bar({
            Time: time,
            Open: open,
            High: high,
            Low: low,
            Close: close,
            TickVolume: tickVolume
        });
    }

    // Метод для відображення графіку
    public render() {
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Очищення canvas
        this.ctx.clearRect(0, 0, width, height);

        const groupedBars = this.groupBarsByZoomLevel();

        // Якщо вибраний бар не встановлений, за замовчуванням вибираємо останній видимий бар
        if (!this.selectedBar && groupedBars.length > 0 && this.selectedVolumeBarIndex === null) {
            this.selectedBar = groupedBars[groupedBars.length - 1];
        }

        // Визначення максимальної та мінімальної ціни
        const maxPrice = Math.max(...groupedBars.map(bar => bar.getHigh()));
        const minPrice = Math.min(...groupedBars.map(bar => bar.getLow()));
        let priceRange = maxPrice - minPrice;

        // Обробка випадку, коли priceRange дорівнює нулю
        if (priceRange === 0) {
            priceRange = maxPrice * 0.01; // Встановлюємо мінімальний діапазон
        }

        // Параметри відображення
        const barSpacing = 5;
        const barWidth = 10;
        const topPadding = 30;
        const volumeBarHeight = 30; // Фіксована висота для об'ємів
        const dateLabelHeight = 20; // Висота для міток дат
        const bottomPadding = volumeBarHeight + dateLabelHeight; // Загальний нижній відступ
        const priceScaleWidth = 50; // Ширина шкали цін
        const priceScalePadding = 5; // Внутрішній відступ для шкали цін
        const leftPadding = this.padding;
        const rightPadding = this.padding + priceScaleWidth;
        const availableWidth = width - leftPadding - rightPadding;
        const availableHeight = height - topPadding - bottomPadding;

        // Визначення тривалості бару та поточного інтервалу
        const zoomDurations = [
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

        // Загальна ширина графіка
        const totalBars = groupedBars.length;
        const totalBarsWidth = totalBars * (barWidth + barSpacing) - barSpacing;
        this.totalChartWidth = totalBarsWidth + leftPadding + rightPadding;

        // Зміщення по X
        const maxOffsetX = 0;
        const minOffsetX = width - this.totalChartWidth;

        if (!this.offsetXInitialized) {
            if (this.totalChartWidth <= width) {
                this.offsetX = (width - this.totalChartWidth) / 2;
            } else {
                this.offsetX = minOffsetX;
            }
            this.offsetXInitialized = true;
        }

        // Максимальний об'єм для нормалізації висоти стовпчиків об'єму
        const maxVolume = Math.max(...groupedBars.map(bar => bar.getTickVolume())) || 1; // Уникаємо ділення на нуль

        // Ініціалізація часів першого та останнього видимих барів
        let firstVisibleBarTime: number = 0;
        let lastVisibleBarTime: number = 0;
        
        // Масив для зберігання видимих барів
        const visibleBars: Bar[] = [];

        // Параметри шкали цін
        const numberOfIntervals = 5; // Кількість інтервалів між ціновими рівнями
        const numberOfPriceLevels = numberOfIntervals + 1; // Загальна кількість цінових рівнів

        // Розрахунок кроків по ціні та позиції
        const priceStep = priceRange / numberOfIntervals;
        const pricePositions: PricePosition[] = [];

        for (let i = 0; i <= numberOfIntervals; i++) {
            const price = maxPrice - i * priceStep;
            const y = topPadding + ((maxPrice - price) / priceRange) * availableHeight;
            pricePositions.push({ price, y });
        }

        // Відображення горизонтальних ліній та шкали цін
        this.ctx.fillStyle = 'black';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'left';

        pricePositions.forEach(position => {
            // Відображення горизонтальної лінії
            this.ctx.strokeStyle = '#e0e0e0'; // Світло-сірий колір для ліній
            this.ctx.beginPath();
            this.ctx.moveTo(leftPadding, position.y);
            this.ctx.lineTo(width - rightPadding, position.y);
            this.ctx.stroke();

            // Адаптивна кількість знаків після коми
            let decimalPlaces = 2;
            if (priceRange < 1) {
                decimalPlaces = 4;
            } else if (priceRange < 0.1) {
                decimalPlaces = 6;
            }

            const priceText = position.price.toFixed(decimalPlaces);
            this.ctx.fillText(priceText, width - priceScaleWidth + priceScalePadding, position.y + 3);
        });
        
        // Відображення барів
        groupedBars.forEach((bar, index) => {
            const barX = this.offsetX + leftPadding + index * (barWidth + barSpacing);

            const {highY, lowY, barTopY, barHeight} = bar.calculateBarDimensions(maxPrice, priceRange, topPadding, availableHeight)

            // Перевірка видимості бару
            if (barX + barWidth >= leftPadding && barX - barWidth <= width - rightPadding) {
                // Додаємо бар в масив видимих барів
                visibleBars.push(bar);

                // Встановлюємо часи першого та останнього видимих барів
                if (visibleBars.length === 1) {
                    firstVisibleBarTime = bar.getTime();
                }
                lastVisibleBarTime = bar.getTime() + durationInSeconds;

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
        });

        // Якщо немає видимих барів, виходимо з методу
        if (visibleBars.length === 0) {
            return;
        }

        // Відображення часових діапазонів видимих барів та поточного інтервалу
        const firstDate = new Date(firstVisibleBarTime * 1000);
        const lastDate = new Date(lastVisibleBarTime * 1000);

        const firstDateString = this.formatDateTime(firstDate);
        const lastDateString = this.formatDateTime(lastDate);

        this.ctx.fillStyle = 'black';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left'; // Вирівнювання тексту по лівому краю
        const timeRangeText = `Visible Range: ${firstDateString} - ${lastDateString} (Interval: ${currentInterval})`;
        this.ctx.fillText(timeRangeText, this.padding, 20);

        // Визначення кількості міток та формат дати на основі рівня зума
        let labelCount: number;
        let includeDate: boolean = false;

        if (durationInMinutes <= 30) {
            // 1, 5, 15, 30 хвилин
            labelCount = 6;
            includeDate = false;
        } else if (durationInMinutes <= 180) {
            // 1, 3 години
            labelCount = 5;
            includeDate = true;
        } else if (durationInMinutes <= 720) {
            // 6, 12 годин
            labelCount = 4;
            includeDate = true;
        } else {
            // 1 день
            // Визначаємо кількість днів між першим та останнім видимим баром
            const startDate = new Date(firstVisibleBarTime * 1000);
            const endDate = new Date(lastVisibleBarTime * 1000);
            const dayDifference = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

            labelCount = Math.min(dayDifference, 4);
            includeDate = true;

            if (labelCount < 2) {
                labelCount = 2; // Мінімум 2 мітки для днів
            }
        }

        // Фіксовані позиції для міток дат
        this.ctx.fillStyle = 'black';
        this.ctx.font = '10px Arial';

        const labelY = height - 5; // Позиція Y для міток часу

        for (let i = 0; i < labelCount; i++) {
            let positionX = leftPadding + (i * availableWidth) / (labelCount - 1);
            const time = firstVisibleBarTime + (i * (lastVisibleBarTime - firstVisibleBarTime)) / (labelCount - 1);

            const date = new Date(time * 1000);
            let dateString: string;

            if (durationInMinutes >= 1440) { // Якщо інтервал 1 день або більше
                dateString = this.formatDate(date);
            } else if (includeDate) {
                dateString = this.formatDateTime(date);
            } else {
                dateString = this.formatTime(date);
            }

            // Налаштування вирівнювання тексту
            if (i === 0) {
                this.ctx.textAlign = 'left';
            } else if (i === labelCount - 1) {
                this.ctx.textAlign = 'right';
            } else {
                this.ctx.textAlign = 'center';
            }

            // Відображення мітки часу
            this.ctx.fillText(dateString, positionX, labelY);
        }

        // Повертаємо вирівнювання тексту за замовчуванням
        this.ctx.textAlign = 'left';

        // Відображення плашки над вибраним об'ємним блоком
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

        // Відображення лінії та плашки над вибраним баром
        if (this.selectedBar) {
            // Визначення індексу вибраного бару
            const selectedBarIndex = groupedBars.findIndex(bar => bar.getTime() === this.selectedBar!.getTime());

            // Координата X вибраного бару
            const barX = this.offsetX + leftPadding + selectedBarIndex * (barWidth + barSpacing);

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
            } else if (labelY + labelHeight > height - bottomPadding) {
                labelY = height - bottomPadding - labelHeight;
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

    // Метод для масштабування графіка
    public zoom(zoomIn: boolean) {
        if (zoomIn && this.zoomLevel > 0) {
            this.zoomLevel--;
        } else if (!zoomIn && this.zoomLevel < 8) {
            this.zoomLevel++;
        }
        this.offsetXInitialized = false; // При зміні зума потрібно перерахувати offsetX

        // Встановлюємо вибраний бар на останній бар після зміни зума
        const groupedBars = this.groupBarsByZoomLevel();
        if (groupedBars.length > 1) {
            this.selectedBar = groupedBars[groupedBars.length - 1];
        } else {
            this.selectedBar = null;
        }
        this.selectedVolumeBarIndex = null; // Скидаємо вибраний об'ємний блок
        this.render();
    }

    // Метод для прокручування графіка
    public scroll(deltaX: number) {
        const width = this.canvas.width;
        const leftPadding = this.padding;
        const rightPadding = this.padding + 50; // 50 - ширина шкали цін
        const totalContentWidth = this.totalChartWidth - leftPadding - rightPadding;
        const maxOffsetX = 0;
        const minOffsetX = width - this.totalChartWidth;

        this.offsetX += deltaX;

        // Обмежуємо прокручування
        if (this.totalChartWidth <= width) {
            this.offsetX = (width - this.totalChartWidth) / 2;
        } else {
            this.offsetX = Math.min(this.offsetX, maxOffsetX);
            this.offsetX = Math.max(this.offsetX, minOffsetX);
        }

        this.render();
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
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Параметри відображення (повинні співпадати з параметрами в методі render)
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

        // Обчислення maxPrice та minPrice так само, як в render()
        const groupedBars = this.groupBarsByZoomLevel();
        const maxPrice = Math.max(...groupedBars.map(bar => bar.getHigh()));
        const minPrice = Math.min(...groupedBars.map(bar => bar.getLow()));
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
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Параметри відображення (повинні співпадати з параметрами в методі render)
        const barSpacing = 5;
        const barWidth = 10;
        const volumeBarHeight = 30;
        const dateLabelHeight = 20;
        const bottomPadding = volumeBarHeight + dateLabelHeight;
        const priceScaleWidth = 50;
        const leftPadding = this.padding;
        const rightPadding = this.padding + priceScaleWidth;

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
