class BoxPlot {
  // fields
  svg;
  width;
  height;
  xScale;
  yScale;

  constructor(elementId) {
    const margin = {top: 20, right: 20, bottom: 30, left: 40};
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

  build(url) {
    d3.json(url, (error,data)=> {
      this.xScale.domain( data.sort( (a,b)=>{return a.rank-b.rank;} ).map( (d)=>{return d.rank.toString();} ) );
      this.yScale.domain([
        0.0,
        d3.max(data, (d)=>{ return d.finish_at;})
      ]);

      this.buildAxis();

      const tooltip = d3.select('span#tooltip');

      this.svg.selectAll(".bar")
        .data(data)
      .enter().append("rect")
        .attr("class", "bar")
        .attr("x", (d) => { return this.xScale(d.rank.toString()); })
        .attr("width", this.xScale.rangeBand())
        .attr("y", (d) => { return this.yScale(d.start_at); })
        .attr("height", (d) => { return this.yScale(d.finish_at - d.start_at); })
        .attr("rx", 4).attr("ry", 4)
        .style("opacity", .8)
        .on("mouseover", function(d) {
          d3.select(this).style("opacity", 1);
          let t = `task_id: ${d.task_id}, time: ${d.start_at} - ${d.finish_at}, rank: ${d.rank}, output: ${JSON.stringify(d.output)}`
          if (d.input) { t += `, input: ${JSON.stringify(d.input)}`; }
          tooltip.style("visibility", "visible")
            .text(t);
        })
        .on("mousemove", function(d){
          tooltip
            .style("top", (d3.event.pageY-20)+"px")
            .style("left", (d3.event.pageX+10)+"px");
        })
        .on("mouseout", function(d) {
          d3.select(this).style("opacity", .8);
          tooltip.style("visibility", "hidden");
        });
      this.updateRankRange();
    });
  }

  buildAxis() {
    const xAxis = d3.svg.axis().scale(this.xScale).orient("bottom");
    const yAxis = d3.svg.axis().scale(this.yScale).orient("left");
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

  updateRankRange() {
    const domain = this.xScale.domain();
    const s = `${domain[0]}-${domain[domain.length-1]}`;
    d3.select('#rank_range_input')[0][0].value = s;
  }
}

document.body.onload = () => {
    d3.json('/filling_rate', (err, data) => {
        d3.select('#input_file').text("File: " + data["file"] + " (" + data["file_info"] + ")");
        d3.select('#num_runs').text("# of Runs: " + data["num_runs"]);
        d3.select('#filling_rate').text("filling rate: " + data["filling_rate"] * 100.0 + " %");
        d3.select('#rank_range').text("rank range: " + data["rank_range"][0] + " - " + data["rank_range"][1]);
        d3.select('#num_consumer_ranks').text("# of consumer ranks: " + data["num_consumer_ranks"]);
        d3.select('#max_finish_at').text("max finish at: " + data["max_finish_at"]);
    });
    var box = new BoxPlot('#plot');
    box.build('/runs');
};
d3.select('#rank_range_update').on('click', () => {
    var url = '/runs?rank=' + d3.select('#rank_range_input')[0][0].value;
    d3.select('#plot').selectAll("*").remove();
    var box = new BoxPlot('#plot');
    box.build(url);
});
