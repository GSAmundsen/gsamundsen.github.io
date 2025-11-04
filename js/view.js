"use strict";

//Updates the view, using values from the model, and functions from the controller
function updateView() {
    
    document.getElementById('app').innerHTML = /*html*/`
    <div style="justify-items: center;">
    <div style="display: block; width: 40%; text-align:left; border: 2px solid grey;  box-shadow: 5px 5px 10px rgba(0, 0, 0, 0.75);"><h4 id="scenarioTextHeader"></h4>
    <p id="taskText"></p>
    
    </div>
    <div style="display: block; border: 2px solid grey;  box-shadow: 3px 3px 10px rgba(0, 0, 0, 0.75);margin-top: 1%;">
    <canvas id="BPMNcanvas"></canvas>
    </div>
    <div> <button style="height: 50px; width: 150px; margin-top: 30px" onclick="testSolution()">Verify Solution</button> </div>
    </div>
  
    
    `; 
    initCanvas();
    //createBoxes();
    

   
}