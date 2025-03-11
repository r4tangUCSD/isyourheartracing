import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import { drawCategoryBubbles } from "categoryBubbles.js";
import { showCategoryDetail } from "categoryDetail.js";
import { loadHeartRateData, createWholeGraph } from "heartRateGraph.js";

document.addEventListener("DOMContentLoaded", async function () {
    const allPatients = await loadData();
    drawCategoryBubbles(allPatients, showCategoryDetail);
});

async function loadData() {
    try {
        const patientData = await d3.csv("emergency_everything.csv");
        return patientData.map(d => ({
            id: d.case_id,
            age: +d.age,
            max_hr: +d.max_hr,
            duration: Math.round(+d.duration / 60),
            category: d.optype
        }));
    } catch (error) {
        console.error("Error loading data:", error);
        return [];
    }
}