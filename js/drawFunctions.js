// GATEWAY-TEGNING I BPMN-STIL 
// Disse funksjonene tegner diamantformede noder (gateways) i canvas.
// Hver gateway-type får et unikt symbol inni diamanten (X, +, eller o).

// Tegner selve diamantformen som gatewayene bygger på
function drawDiamond(x, y, size, color = "#fff") {
  context.beginPath();
  context.moveTo(x, y - size / 2);         // topp-punkt
  context.lineTo(x + size / 2, y);         // høyre-punkt
  context.lineTo(x, y + size / 2);         // bunn-punkt
  context.lineTo(x - size / 2, y);         // venstre-punkt
  context.closePath();                     // lukker figuren
  context.fillStyle = color;               // fyllfarge inni diamanten
  context.fill();
  context.strokeStyle = "black";           // svart kantlinje
  context.lineWidth = 2;
  context.stroke();
}

// Parallell gateway (AND) 
// Brukes når flere flyter skal skje samtidig (alle grener kjøres)
function drawParallelGateway(x, y, size) {
  drawDiamond(x, y, size, context.fillStyle);         // tegn diamant +// Uses the current fillstyle. Selected or normal color
  context.beginPath();
  // Tegner et pluss-tegn (+) inni diamanten
  context.moveTo(x - size / 4, y);         // horisontal strek
  context.lineTo(x + size / 4, y);
  context.moveTo(x, y - size / 4);         // vertikal strek
  context.lineTo(x, y + size / 4);
  context.strokeStyle = "black";
  context.lineWidth = 3;
  context.stroke();
}

// Inklusiv gateway (OR)
// Brukes når en eller flere flyter kan aktiveres samtidig
function drawInclusiveGateway(x, y, size) {
  drawDiamond(x, y, size,  context.fillStyle);         // tegn diamant
  context.beginPath();
  // Tegner en liten sirkel inni diamanten
  context.arc(x, y, size / 5, 0, Math.PI * 2);
  context.strokeStyle = "black";
  context.lineWidth = 2;
  context.stroke();
}

// Eksklusiv gateway (XOR) 
// Brukes når bare én vei kan tas (enten/eller)
function drawExclusiveGateway(x, y, size) {
  drawDiamond(x, y, size,  context.fillStyle);         // tegn diamant
  context.beginPath();
  // Tegner en X inni diamanten
  context.moveTo(x - size / 4, y - size / 4);
  context.lineTo(x + size / 4, y + size / 4);
  context.moveTo(x + size / 4, y - size / 4);
  context.lineTo(x - size / 4, y + size / 4);
  context.strokeStyle = "black";
  context.lineWidth = 2;
  context.stroke();
}

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

  // Tegn pilspiss
  context.beginPath();
  context.moveTo(toX, toY);
  context.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
  context.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
  context.closePath();
  context.fillStyle = "blue";
  context.fill();
}








function drawLanes(ls = [])
{
    if(ls.length == 0){console.log ("No lanes to be drawn"); return} //if the list of lanes is empty, log msg, then do nothing.
    context.strokeStyle = model.settings.laneBorderColor; //Gets the color we're using for the lane border

    for (l of ls){
        context.strokeRect(l.x, l.y, l.w, l.h);
        context.fillStyle = "black";
        context.font = "14px Arial";
        context.textAlign = "left";
        context.textBaseline = "top";
        
        context.fillText(l.name, l.x+5, l.y+5); //slight offset from the top left, so the text doesnt hug the border
       
    }

}