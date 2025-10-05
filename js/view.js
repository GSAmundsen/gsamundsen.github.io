"use strict";

//Updates the view, using values from the model, and functions from the controller
function updateView() {
    
    document.getElementById('app').innerHTML = /*html*/`
    <div><h2 id="scenarioTextHeader"></h2></div>
    <canvas id="BPMNcanvas"></canvas>
    
  
    
    `; 
    initCanvas();
    //createBoxes();
    

   
}