/// <reference path="../typings/tsd.d.ts" />

interface Run {
  id: number;
  parentPSId: number;
  seed: number;
  result: number;
  placeId: number;
  startAt: number;
  finishAt: number;
}

class BoxPlot {

  private svg: d3.Selection<any>;
  private width: number;
  private height: number;
  private xScale: d3.scale.Ordinal<string,number>;
  private yScale: d3.scale.Linear<number,number>;
  
  constructor(elementId: string) {
    var margin = {top: 20, right: 20, bottom: 30, left: 40};
    this.width = 1000 - margin.left - margin.right,
    this.height = 1800 - margin.top - margin.bottom;
    
    this.xScale = d3.scale.ordinal().rangeRoundBands([0,this.width], .1, 1);
    this.yScale = d3.scale.linear().range([0,this.height]);
    
    this.svg = d3.select(elementId).append("svg")
      .attr("width", this.width + margin.left + margin.right)
      .attr("height", this.height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate("+margin.left+","+margin.top+")");
  }
  
  public build(url: string) {
    d3.json(url, (error: any, data: Run[]):void => {
      
      this.xScale.domain( data.sort( (a,b)=>{return a.placeId-b.placeId;} ).map( (d)=>{return d.placeId.toString();} ) );
      this.yScale.domain([
        0.0,
        d3.max(data, (d)=>{ return d.finishAt;})
      ]);
      
      this.buildAxis();
      
      var tooltip = d3.select('span#tooltip');
      
      this.svg.selectAll(".bar")
        .data(data)
      .enter().append("rect")
        .attr("class", "bar")
        .attr("x", (d) => { return this.xScale(d.placeId.toString()); })
        .attr("width", this.xScale.rangeBand())
        .attr("y", (d) => { return this.yScale(d.startAt); })
        .attr("height", (d) => { return this.yScale(d.finishAt - d.startAt); })
        .attr("rx", 4).attr("ry", 4)
        .style("opacity", .8)
        .on("mouseover", function(d) {
          d3.select(this).style("opacity", 1);
          var t: string =
            `id: ${d.id},
             time: ${d.startAt} - ${d.finishAt},
             place: ${d.placeId},
             parentPSId: ${d.parentPSId},
             result: ${d.result}
             `;
          tooltip.style("visibility", "visible")
            .text(t);
        })
        .on("mousemove", function(d){
          tooltip
            .style("top", (d3.event.pageY-20)+"px")
            .style("left", (d3.event.pageX+10)+"px");
        })
        .on("mouseout", function(d){
          d3.select(this).style("opacity", .8);
          tooltip.style("visibility", "hidden");
        });
      this.updatePlaceRange();
    });
  }
  
  private buildAxis() {
    var xAxis = d3.svg.axis().scale(this.xScale).orient("bottom");
    var yAxis = d3.svg.axis().scale(this.yScale).orient("left");
    this.svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + this.height + ")")
      .call(xAxis);
    this.svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Time");
  }

  private updatePlaceRange() {
    var domain = this.xScale.domain();
    var s = `${domain[0]}-${domain[domain.length-1]}`;
    d3.select('#place_range_input')[0][0].value = s;
  }
}

document.body.onload = function() {
  d3.json('/filling_rate', (err:any, data) => {
    d3.select('#filling_rate').text(`filling rate: ${data["filling_rate"]*100.0} %`);
    d3.select('#place_range').text(`place range: ${data["place_range"][0]} - ${data["place_range"][1]}`);
    d3.select('#num_consumer_places').text(`# of consumer places: ${data["num_consumer_places"]}`);
  });
  var box = new BoxPlot('#plot');
  box.build('/runs');
}

d3.select('#place_range_update').on('click', function() {
  var url = '/runs?place=' + d3.select('#place_range_input')[0][0].value;
  d3.select('#plot').selectAll("*").remove();
  var box = new BoxPlot('#plot');
  box.build(url);
});
