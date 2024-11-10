// Bar.ts
export class Bar {
    private data: BarData;

    constructor(data: BarData) {
        this.data = data;
    }

    // Отримання значення відкриття
    public getOpen(): number {
        return this.data.Open;
    }

    // Отримання значення закриття
    public getClose(): number {
        return this.data.Close;
    }

    // Отримання значення максимуму
    public getHigh(): number {
        return this.data.High;
    }

    // Отримання значення мінімуму
    public getLow(): number {
        return this.data.Low;
    }

    // Отримання часу
    public getTime(): number {
        return this.data.Time;
    }

    // Отримання об'єму угод
    public getTickVolume(): number {
        return this.data.TickVolume;
    }

    // Отримання кольору бару в залежності від значення Open і Close
    public getColor(): string {
        if (this.data.Close > this.data.Open) {
            return 'green'; // Бар росту
        } else if (this.data.Close < this.data.Open) {
            return 'red'; // Бар падіння
        } else {
            return 'gray'; // Бар без змін
        }
    }

    // Обчислення координат та розміру бару
    public calculateBarDimensions(maxPrice: number, priceRange: number, topPadding: number, availableHeight: number) {
        // Координаты Y для бара
        const openY = topPadding + ((maxPrice - this.data.Open) / priceRange) * availableHeight;
        const closeY = topPadding + ((maxPrice - this.data.Close) / priceRange) * availableHeight;
        const highY = topPadding + ((maxPrice - this.data.High) / priceRange) * availableHeight;
        const lowY = topPadding + ((maxPrice - this.data.Low) / priceRange) * availableHeight;
        // Определяем верхнюю и нижнюю точки тела бара
        let barTopY = Math.min(openY, closeY)
        let barBottomY = Math.max(openY, closeY)
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
        // Повертаємо координати, які знадобляться для малювання
        return { highY, lowY, barTopY, barHeight };
    }
}
