// RenderChart.ts
import { Bar } from "./Bar";

export class RenderChart {
    public canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private selectedBar: Bar | null = null; 
    private selectedVolumeBarIndex: number | null = null;
    
    private height: number;
    private width: number;
    private availableHeight: number;
    private availableWidth: number;
    private bottomPadding: number;
    private leftPadding: number;
    private rightPadding: number;
    // Конфигурационные параметры
    private config = {
        padding: 30,
        topPadding: 30,
        volumeBarHeight: 30,
        dateLabelHeight: 20,
        barWidth: 10,
        priceScaleWidth: 50,
    };


    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.initializeDimensions();
    }

    private initializeDimensions() {
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.bottomPadding = this.config.volumeBarHeight + this.config.dateLabelHeight;
        this.leftPadding = this.config.padding;
        this.rightPadding = this.config.padding + this.config.priceScaleWidth;
        this.availableHeight = this.height - this.config.topPadding - this.bottomPadding;
        this.availableWidth = this.width - this.leftPadding - this.rightPadding;
    }

    // Общий метод для установки стилей контекста
    private setContextStyles(styles: Partial<CanvasRenderingContext2D>) {
        Object.assign(this.ctx, styles);
    }

    // Метод для отображения баров (разделен на отрисовку теней и тела)
    public drawBars(bar: Bar, maxPrice: number, priceRange: number, barX: number) {
        const { highY, lowY, barTopY, barHeight } = bar.calculateBarDimensions(maxPrice, priceRange, this.config.topPadding, this.availableHeight);
        
        this.drawBarShadow(barX, highY, lowY);
        this.drawBarBody(bar, barX, barTopY, barHeight);
    }

    // Подметод для отрисовки тени бара
    private drawBarShadow(barX: number, highY: number, lowY: number) {
        this.setContextStyles({ strokeStyle: 'black' });
        this.ctx.beginPath();
        this.ctx.moveTo(barX, highY);
        this.ctx.lineTo(barX, lowY);
        this.ctx.stroke();
    }

    // Подметод для отрисовки тела бара
    private drawBarBody(bar: Bar, barX: number, barTopY: number, barHeight: number) {
        this.setContextStyles({ fillStyle: bar.getColor() });
        this.ctx.fillRect(barX - this.config.barWidth / 2, barTopY, this.config.barWidth, barHeight);
    }

    // Метод для отображения баров объема
    public drawVolumeBars(bar: Bar, index: number, maxVolume: number, barX: number) {
        let volumeHeight = Math.max((bar.getTickVolume() / maxVolume) * this.config.volumeBarHeight, 1);
        const volumeY = this.height - this.config.dateLabelHeight - volumeHeight;

        this.setContextStyles({ fillStyle: 'blue' });
        this.ctx.fillRect(barX - this.config.barWidth / 2, volumeY, this.config.barWidth, volumeHeight);

        if (this.selectedVolumeBarIndex === index) {
            this.drawVolumeBarLabel(barX, volumeY, bar.getTickVolume());
        }
    }

    // Метод для отображения шкалы цен
    public drawPriceScale(maxPrice: number, priceRange: number) {
        const numberOfIntervals = 5;
        const priceStep = priceRange / numberOfIntervals;
        const pricePositions: PricePosition[] = [];

        for (let i = 0; i <= numberOfIntervals; i++) {
            const price = maxPrice - i * priceStep;
            const y = this.config.topPadding + ((maxPrice - price) / priceRange) * this.availableHeight;
            pricePositions.push({ price, y });
        }

        this.setContextStyles({ fillStyle: 'black', font: '10px Arial', textAlign: 'left' });
        this.drawPriceLines(pricePositions, priceRange);
    }

    // Подметод для отрисовки линий на шкале цен
    private drawPriceLines(pricePositions: PricePosition[], priceRange: number) {
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
    private getDecimalPlaces(priceRange: number): number {
        if (priceRange < 0.1) {
            return 6;
        } else if (priceRange < 1) {
            return 4;
        } else {
            return 2;
        }
    }

    // Метод для отрисовки выделенного бара
    public drawSelectedBarHighlight(maxPrice: number, priceRange: number, durationInSeconds: number) {
        if (!this.selectedBar) return;

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
    private drawSelectedBarLabel(barTopPrice: number, lineY: number, durationInSeconds: number) {
        const date = new Date((this.selectedBar!.getTime() + durationInSeconds) * 1000);
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
    public drawDateScale(durationInMinutes: number) {
        const { labelCount, includeDate } = this.calculateLabelCount(durationInMinutes);
        const labelY = this.height - 5;

        this.setContextStyles({ fillStyle: 'black', font: '10px Arial' });

        for (let i = 0; i < labelCount; i++) {
            const positionX = this.leftPadding + (i * this.availableWidth) / (labelCount - 1);
            const time = this.selectedBar ? this.selectedBar.getTime() + (i * durationInMinutes * 60) : 0;
            const date = new Date(time * 1000);
            const dateString = this.formatLabelDate(date, includeDate);
            this.ctx.fillText(dateString, positionX, labelY);
        }
    }

    private calculateLabelCount(durationInMinutes: number): { labelCount: number, includeDate: boolean } {
        if (durationInMinutes <= 30) {
            return { labelCount: 6, includeDate: false };
        } else if (durationInMinutes <= 180) {
            return { labelCount: 5, includeDate: true };
        } else if (durationInMinutes <= 720) {
            return { labelCount: 4, includeDate: true };
        } else {
            return { labelCount: 3, includeDate: true };
        }
    }

    private formatLabelDate(date: Date, includeDate: boolean): string {
        if (includeDate) {
            return this.formatDateTime(date);
        } else {
            return this.formatTime(date);
        }
    }

    // Метод для отображения плашки над выбранным объемным баром
    private drawVolumeBarLabel(barX: number, volumeY: number, volume: number) {
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

    private drawRoundedRect(x: number, y: number, width: number, height: number, radius: number, fillColor: string) {
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
    public updateSelectedBar(bar:Bar) {
    this.selectedBar = bar;
    this.selectedVolumeBarIndex = null; // Скидаємо вибраний об'ємний блок
}

    public updateSelectedVolumeBarIndex(index) {
    this.selectedVolumeBarIndex=index
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
}