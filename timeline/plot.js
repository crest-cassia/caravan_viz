/// <reference path="../typings/tsd.d.ts" />
var BoxPlot = /** @class */ (function () {
    function BoxPlot(elementId) {
        var margin = { top: 20, right: 20, bottom: 30, left: 40 };
        this.width = 1000 - margin.left - margin.right,
            this.height = 1800 - margin.top - margin.bottom;
        this.xScale = d3.scale.ordinal().rangeRoundBands([0, this.width], .1, 1);
        this.yScale = d3.scale.linear().range([0, this.height]);
        this.svg = d3.select(elementId).append("svg")
            .attr("width", this.width + margin.left + margin.right)
            .attr("height", this.height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    }
    BoxPlot.prototype.build = function (url) {
        var _this = this;
        d3.json(url, function (error, data) {
            _this.xScale.domain(data.sort(function (a, b) { return a.rank - b.rank; }).map(function (d) { return d.rank.toString(); }));
            _this.yScale.domain([
                0.0,
                d3.max(data, function (d) { return d.finish_at; })
            ]);
            _this.buildAxis();
            var tooltip = d3.select('span#tooltip');
            _this.svg.selectAll(".bar")
                .data(data)
                .enter().append("rect")
                .attr("class", "bar")
                .attr("x", function (d) { return _this.xScale(d.rank.toString()); })
                .attr("width", _this.xScale.rangeBand())
                .attr("y", function (d) { return _this.yScale(d.start_at); })
                .attr("height", function (d) { return _this.yScale(d.finish_at - d.start_at); })
                .attr("rx", 4).attr("ry", 4)
                .style("opacity", .8)
                .on("mouseover", function (d) {
                d3.select(this).style("opacity", 1);
                var t = "id: " + d.id + ", time: " + d.start_at + " - " + d.finish_at + ", place: " + d.rank + ", output: " + JSON.stringify(d.output);
                tooltip.style("visibility", "visible")
                    .text(t);
            })
                .on("mousemove", function (d) {
                tooltip
                    .style("top", (d3.event.pageY - 20) + "px")
                    .style("left", (d3.event.pageX + 10) + "px");
            })
                .on("mouseout", function (d) {
                d3.select(this).style("opacity", .8);
                tooltip.style("visibility", "hidden");
            });
            _this.updatePlaceRange();
        });
    };
    BoxPlot.prototype.buildAxis = function () {
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
    };
    BoxPlot.prototype.updatePlaceRange = function () {
        var domain = this.xScale.domain();
        var s = domain[0] + "-" + domain[domain.length - 1];
        d3.select('#place_range_input')[0][0].value = s;
    };
    return BoxPlot;
}());
document.body.onload = function () {
    d3.json('/filling_rate', function (err, data) {
        d3.select('#num_runs').text("# of Runs: " + data["num_runs"]);
        d3.select('#filling_rate').text("filling rate: " + data["filling_rate"] * 100.0 + " %");
        d3.select('#place_range').text("place range: " + data["place_range"][0] + " - " + data["place_range"][1]);
        d3.select('#num_consumer_places').text("# of consumer places: " + data["num_consumer_places"]);
        d3.select('#max_finish_at').text("max finish at: " + data["max_finish_at"]);
    });
    var box = new BoxPlot('#plot');
    box.build('/runs');
};
d3.select('#place_range_update').on('click', function () {
    var url = '/runs?place=' + d3.select('#place_range_input')[0][0].value;
    d3.select('#plot').selectAll("*").remove();
    var box = new BoxPlot('#plot');
    box.build(url);
});
