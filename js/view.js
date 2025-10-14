"use strict";

//Updates the view, using values from the model, and functions from the controller
function updateView() {
    
    document.getElementById('app').innerHTML = /*html*/`
    <div><h4 id="scenarioTextHeader"></h4>
    <p>Example test: Open the console and run testSolution() . This tests the solution in the scenario against the current hardcoded user solution in the controller</p>
    <p>Press the 'Delete' key to remove connections. Click a node first to delete connections to/from that node</p>
    
    </div>
    <canvas id="BPMNcanvas"></canvas>
    
  
    
    `; 
    initCanvas();
    //createBoxes();
    

   
}