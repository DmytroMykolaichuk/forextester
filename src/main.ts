// main.ts
import { Chart } from './Chart';
import DataService from "./dataService";

const apiUrl = 'https://beta.forextester.com/data/api/Metadata/bars/chunked?Broker=Advanced&Symbol=EURUSD&Timeframe=1&Start=57674&End=59113&UseMessagePack=false';
// const apiUrl ='https://beta.forextester.com/data/api/Metadata/bars/chunked?Broker=Advanced&Symbol=USDJPY&Timeframe=1&Start=57674&End=59113&UseMessagePack=false'

async function initializeApp() {
    try {
        const data = await fetchData(apiUrl);

        if (data.length > 0) {
            const chart = initializeChart(data);
            setupEventListeners(chart);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function fetchData(apiUrl: string) {
    const dataService = new DataService(apiUrl);
    return await dataService.fetchData();
}

function initializeChart(data: DataChunk[]): Chart {
    const canvas = document.getElementById('chartCanvas') as HTMLCanvasElement;
    const chart = new Chart(canvas, data);
    chart.initializeVisibleRange();
    chart.render();
    return chart;
}

function setupEventListeners(chart: Chart) {
    chart.canvas.addEventListener('wheel', handleWheelEvent(chart));
    chart.canvas.addEventListener('mousedown', handleMouseDownEvent(chart));
}
//Замикання
function handleWheelEvent(chart: Chart) {
    return (event: WheelEvent) => {
        event.preventDefault();
        chart.zoom(event.deltaY < 0);
    };
}

function handleMouseDownEvent(chart: Chart) {
    return (event: MouseEvent) => {
        let startX = event.clientX;

        const onMouseMove = (moveEvent: MouseEvent) => {
            // Обчислює зміну положення миші по осі X
            const deltaX = moveEvent.clientX - startX;
            // Оновлює значення початкової позиції для наступного розрахунку
            startX = moveEvent.clientX;
            // Прокручує графік на певну величину в залежності від зміщення миші
            chart.scroll(deltaX);
        };

        // Функція, що завершує обробку події натискання миші
        const onMouseUp = () => {
            // Видаляє слухачі подій для переміщення та відпускання миші після завершення прокручування
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        // Додає слухач для події переміщення миші під час натискання кнопки
        document.addEventListener('mousemove', onMouseMove);
        // Додає слухач для події відпускання кнопки миші, щоб завершити прокручування
        document.addEventListener('mouseup', onMouseUp);
    };
}

initializeApp();
