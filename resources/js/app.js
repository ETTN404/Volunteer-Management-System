import './bootstrap';
import Alpine from 'alpinejs';
import Chart from 'chart.js/auto';

// Expose globally so inline blade scripts can access them
window.Alpine = Alpine;
window.Chart = Chart;

Alpine.start();
