"use strict";

function recalculate(){
  var w = Math.min(cs.base.width ,cs.result.width );
  var h = Math.min(cs.base.height,cs.result.height);

  cs.overlay.width  = w;
  cs.overlay.height = h;
  cs.transparency.width  = w;
  cs.transparency.height = h;
  cs.choices.width  = w;
  cs.choices.height = h;
  cs.guess.width  = w;
  cs.guess.height = h;

  var gc = new Float32Array(w*h);
  var ggc = new Float32Array(w*h);
  var bmi = new Float32Array(w*h);
  var bma = new Float32Array(w*h);
  var bA = cs.base.context.getImageData(0,0,w,h).data;
  var bC = cs.result.context.getImageData(0,0,w,h).data;
  var bB = cs.overlay.context.createImageData(w,h);
  var tBd = bB.data;
  var bD = cs.transparency.context.createImageData(w,h);
  var tDd = bD.data;
  var bE = cs.choices.context.createImageData(w,h);
  var tEd = bE.data;
  var bF = cs.guess.context.createImageData(w,h);
  var tFd = bF.data;

  // Attemp to calculate the overlay image as good as possible
  for(var y=0; y<h; y++)
  for(var x=0; x<w; x++){
    var a = (x+y*w);
    var b = a*4;
    var tA = [bA[b],bA[b+1],bA[b+2],bA[b+3]];
    var tC = [bC[b],bC[b+1],bC[b+2],bC[b+3]];
    var A = [tA[3]/255,tA[0]/255,tA[1]/255,tA[2]/255];
    var C = [tC[3]/255,tC[0]/255,tC[1]/255,tC[2]/255];
    var B = [0,0,0,0];

    var choices = Math.round(256-A[0]*255); // Number of possibel values of C0
    if( choices <= 1 )
      choices = 1;
    var choice = Math.round((C[0]-A[0])*255); // Which possibillity range for B0
    var Bmin = (  choice    / choices ); // Lowest possible value of B0
    var Bmax = ( (choice+1) / choices ); // Biggest possible value of B0

    // The more different the colors, the less transparent can it be
    var cdist = Math.max( Math.abs(A[1]-C[1]), Math.abs(A[2]-C[2]), Math.abs(A[3]-C[3]) );
    if( Bmin < cdist )
      Bmin = cdist;
    if( Bmin >= Bmax )
      Bmin = Bmax;

    var t; // Guessed transparency in possibillity space
    t = cdist; // can't be calculated certainly, using minimal color change as starting point

    bmi[a] = Bmin;
    bma[a] = Bmax;
    gc[a] = t;

    // Temporary results
    tEd[b+0] = choices;
    tEd[b+1] = choices;
    tEd[b+2] = choices;
    tEd[b+3] = 255;

    tFd[b+0] = Math.round(t*255);
    tFd[b+1] = Math.round(t*255);
    tFd[b+2] = Math.round(t*255);
    tFd[b+3] = 255;
  }

  var gvmax = +document.getElementById("blur").value;

  // Post processing gussed transparency levels, currently just adding a blur effect
  // Here is much room for improvement
  for(var j=0; j<h; j++)
  for(var i=0; i<w; i++){
    var a = (i+j*w);
    var gv = Math.round( ( bma[a] - bmi[a] ) * gvmax );
    if(gv){
      for(var y=j-gv; y<j+gv; y++)
      for(var x=i-gv; x<i+gv; x++){
        if( x<0 || x>w || y<0 || y>h )
          continue;
        var b = (x+y*w);
        var f = 1 - Math.sqrt( ( (x-i)*(x-i) + (y-j)*(y-j) ) / (gv*gv*2) );
        var r = bmi[b] * (1-gc[b]) + bma[b] * gc[b];
        ggc[a] = ggc[a] * (1-f) + r * f;
      }
    }else{
      ggc[a] = bmi[a] * (1-gc[a]) + bma[a] * gc[a];
    }
  }

  for(var y=0; y<h; y++)
  for(var x=0; x<w; x++){
    var a = (x+y*w);
    var b = a*4;
    var tA = [bA[b],bA[b+1],bA[b+2],bA[b+3]];
    var tC = [bC[b],bC[b+1],bC[b+2],bC[b+3]];
    var A = [tA[3]/255,tA[0]/255,tA[1]/255,tA[2]/255];
    var C = [tC[3]/255,tC[0]/255,tC[1]/255,tC[2]/255];
    var B = [0,0,0,0];

    B[0] = ggc[a];
    if( B[0] >= bma[a] )
      B[0] = bma[a];
    if( B[0] <= bmi[a] )
      B[0] = bmi[a];
    B[1] = (C[1] - A[1]) / B[0] + A[1];
    B[2] = (C[2] - A[2]) / B[0] + A[2];
    B[3] = (C[3] - A[3]) / B[0] + A[3];

    // result
    tBd[b+0] = Math.round(B[1]*255);
    tBd[b+1] = Math.round(B[2]*255);
    tBd[b+2] = Math.round(B[3]*255);
    tBd[b+3] = Math.round(B[0]*255);

    // Temporary results
    tDd[b+0] = Math.round(B[0]*255);
    tDd[b+1] = Math.round(B[0]*255);
    tDd[b+2] = Math.round(B[0]*255);
    tDd[b+3] = 255;

  }

  cs.overlay.context.putImageData(bB,0,0);
  cs.transparency.context.putImageData(bD,0,0);
  cs.choices.context.putImageData(bE,0,0);
  cs.guess.context.putImageData(bF,0,0);

}

const dragAndDropHandler = new DragAndDropHandler( window, {
  upload( path, datatransfer ){
    var canvas = cs[path];
    if(!canvas) return;
    var url = URL.createObjectURL(datatransfer.files[0]);
    var img = new Image();
    img.src = url;
    img.onload = function(){
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.context.drawImage(img,0,0);
      URL.revokeObjectURL(url);
      recalculate();
    }
    img.onerror = function(){
      URL.revokeObjectURL(url);
    }
  }
});

var cs = {
  "base": document.getElementById("base"),
  "result": document.getElementById("result"),
  "overlay": document.getElementById("overlay"),
  "transparency": document.getElementById("transparency"),
  "choices": document.getElementById("choices"),
  "guess": document.getElementById("guess"),
};

for( let k in cs ){
  cs[k].context = cs[k].getContext("2d");
}
