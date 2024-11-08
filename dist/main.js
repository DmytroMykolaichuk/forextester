// maine.ts
import { Chart } from './Chart';
import DataService from "./dataService";
const apiUrl = 'https://beta.forextester.com/data/api/Metadata/bars/chunked?Broker=Advanced&Symbol=EURUSD&Timeframe=1&Start=57674&End=59113&UseMessagePack=false';
// const apiUrl = 'https://beta.forextester.com/data/api/Metadata/bars/chunked?Broker=Advanced&Symbol=USDJPY&Timeframe=1&Start=57674&End=59113&UseMessagePack=false'
async function initializeApp() {
    const dataService = new DataService(apiUrl);
    try {
        const data = await dataService.fetchData();
        if (data.length > 0) {
            const canvas = document.getElementById('chartCanvas');
            console.log(canvas);
            const chart = new Chart(canvas, data[0].Bars, data[0].ChunkStart); // Используем только первую часть данных
            chart.render();
            setupEventListeners(chart);
        }
    }
    catch (error) {
        console.error('Error:', error);
    }
}
function setupEventListeners(chart) {
    chart.canvas.addEventListener('wheel', (event) => {
        event.preventDefault();
        chart.zoom(event.deltaY < 0);
    });
    chart.canvas.addEventListener('mousedown', (event) => {
        let startX = event.clientX;
        const onMouseMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            startX = moveEvent.clientX;
            chart.scroll(deltaX);
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}
initializeApp();
