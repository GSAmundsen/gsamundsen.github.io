"use strict";

//Updates the view, using values from the model, and functions from the controller
function updateView() {
    
    document.getElementById('app').innerHTML = /*html*/`
    <div><h3 id="scenarioTextHeader"></h3>
    <p>Example test: Open the console and run testSolution() . This tests the solution in the scenario against the current hardcoded user solution in the controller</p></div>
    <canvas id="BPMNcanvas"></canvas>
    
  
    
    `; 
    initCanvas();
    //createBoxes();
    

   
}