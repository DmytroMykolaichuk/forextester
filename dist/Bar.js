// Bar.ts
export class Bar {
    constructor(data) {
        this.data = data;
    }
    // Отримання значення відкриття
    getOpen() {
        return this.data.Open;
    }
    // Отримання значення закриття
    getClose() {
        return this.data.Close;
    }
    // Отримання значення максимуму
    getHigh() {
        return this.data.High;
    }
    // Отримання значення мінімуму
    getLow() {
        return this.data.Low;
    }
    // Отримання часу
    getTime() {
        return this.data.Time;
    }
    // Отримання об'єму угод
    getTickVolume() {
        return this.data.TickVolume;
    }
    // Отримання кольору бару в залежності від значення Open і Close
    getColor() {
        if (this.data.Close > this.data.Open) {
            return 'green'; // Бар росту
        }
        else if (this.data.Close < this.data.Open) {
            return 'red'; // Бар падіння
        }
        else {
            return 'gray'; // Бар без змін
        }
    }
    // Обчислення координат та розміру бару
    calculateBarDimensions(maxPrice, priceRange, topPadding, availableHeight) {
        // Координаты Y для бара
        const openY = topPadding + ((maxPrice - this.data.Open) / priceRange) * availableHeight;
        const closeY = topPadding + ((maxPrice - this.data.Close) / priceRange) * availableHeight;
        const highY = topPadding + ((maxPrice - this.data.High) / priceRange) * availableHeight;
        const lowY = topPadding + ((maxPrice - this.data.Low) / priceRange) * availableHeight;
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
        // Повертаємо координати, які знадобляться для малювання
        return { highY, lowY, barTopY, barHeight };
    }
}
