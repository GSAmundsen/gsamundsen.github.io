// BPMN Style symbols
// These functions draw the gateways

// Draws the diamond shape
function drawDiamond(x, y, size, color = "#fff") {
  context.beginPath();
  context.moveTo(x, y - size / 2);         // top-point
  context.lineTo(x + size / 2, y);         // right-point
  context.lineTo(x, y + size / 2);         // bottom-point
  context.lineTo(x - size / 2, y);         // left-point
  context.closePath();                     // closes the figure
  context.fillStyle = color;               // diamond fill color
  context.fill();
  context.strokeStyle = "black";           // black border
  context.lineWidth = 2;
  context.stroke();
}

// Every gateway type gets a symbol within the diamond shape.
// Parallell gateway (AND) 
function drawParallelGateway(x, y, size) {
  drawDiamond(x, y, size, context.fillStyle); // Draws a basic diamond, using the current fillstyle
  context.beginPath();
  // Draws the + sign within the diamond
  context.moveTo(x - size / 4, y);         // horisontal line
  context.lineTo(x + size / 4, y);
  context.moveTo(x, y - size / 4);         // vertical line
  context.lineTo(x, y + size / 4);
  context.strokeStyle = "black";
  context.lineWidth = 3;
  context.stroke();
}

// Inclusive gateway (OR)
function drawInclusiveGateway(x, y, size) {
  drawDiamond(x, y, size,  context.fillStyle);         // draw diamond
  context.beginPath();
  // Draws the O within the diamond
  context.arc(x, y, size / 5, 0, Math.PI * 2);
  context.strokeStyle = "black";
  context.lineWidth = 2;
  context.stroke();
}

// Exclusive gateway (XOR) 
function drawExclusiveGateway(x, y, size) {
  drawDiamond(x, y, size,  context.fillStyle);         // draw diamond
  context.beginPath();
  // Draws the X within the diamond
  context.moveTo(x - size / 4, y - size / 4);
  context.lineTo(x + size / 4, y + size / 4);
  context.moveTo(x + size / 4, y - size / 4);
  context.lineTo(x - size / 4, y + size / 4);
  context.strokeStyle = "black";
  context.lineWidth = 2;
  context.stroke();
}


//Draws the line and arrow on connector lines
function drawArrow(fromX, fromY, toX, toY) {
  const headlen = 10;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const angle = Math.atan2(dy, dx);
  context.beginPath();
  context.moveTo(fromX, fromY);
  context.lineTo(toX, toY);
  context.strokeStyle = "blue";
  context.lineWidth = 2;
  context.stroke();

  // Draws the arrowhead at the calculated mid-point of the line, for readability in complex diagrams
  let middleX = (fromX + toX) / 2;
  let middleY = (fromY + toY) / 2;
  context.beginPath();
  context.moveTo(middleX, middleY);
  context.lineTo(middleX - headlen * Math.cos(angle - Math.PI / 6), middleY - headlen * Math.sin(angle - Math.PI / 6));
  context.lineTo(middleX - headlen * Math.cos(angle + Math.PI / 6), middleY - headlen * Math.sin(angle + Math.PI / 6));
  context.closePath();
  context.fillStyle = "blue";
  context.fill();
}


//calls the drawArrow function for all connecting lines in the connections list
function drawConnections(){
   if (Object.keys(connections).length != 0) {
    for (let c of connections) {
      const from = boxes.find(b => b.nodeId === c.fromId);
      const to = boxes.find(b => b.nodeId === c.toId);
      if (from && to) {
          drawArrow(
          from.x + from.w / 2,
          from.y + from.h / 2,
          to.x + to.w / 2,
          to.y + to.h / 2
          );
      }
    }
  }
}


//draws the task/activity box
function drawTaskBox(startX, startY){
   context.fillRect(startX, startY, model.game.activityBoxWidth, model.game.activityBoxHeight);
   context.strokeStyle = "black";
   context.strokeRect(startX, startY, model.game.activityBoxWidth, model.game.activityBoxHeight);
}

//draws the start and end boxes
function drawStartEndBoxes(startX, startY){
    context.fillRect(startX, startY, 60, 60);
    context.strokeStyle = "black";
    context.strokeRect(startX, startY, 60, 60);
}

//draws the text inside or below the boxes, depending on type
function drawBoxText(cX, cY, box){
  context.fillStyle = "black";
  context.font = "11px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";

  if (box.type.includes("Gateway")) {
    // Places the text slightly below the gateways, because of the gateway symbols
    context.fillText(box.name, cX, cY + box.h / 2 + 15);
  } else {
    // Task boxes has their text inside the box
    context.fillText(box.name, box.x + box.w / 2, box.y + box.h / 2);
  }
}

//Draws each lane defined in the scenario
function drawLanes(ls = [])
{
    if(ls.length == 0){console.log ("No lanes to be drawn"); return} //if the list of lanes is empty, log msg, then do nothing.
    context.strokeStyle = model.settings.laneBorderColor; //Sets the color we're using for the lane border

    //draws each lane on the canvas
    for (let l of ls){
        context.strokeRect(l.x, l.y, l.w, l.h);
        context.fillStyle = "black";
        context.font = "14px Arial";
        context.textAlign = "left";
        context.textBaseline = "top";
        
        context.fillText(l.name, l.x+5, l.y+5); //slight offset from the top left, so the text doesnt hug the border
    }
}

// draws the title text of the pool
function drawPoolTitle(){
  context.font = "16px Arial";
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillText(model.loadedScenarioData.aboutScenarios.poolName, 10, canvas.height/2)
}