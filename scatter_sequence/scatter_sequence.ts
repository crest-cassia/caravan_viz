/// <reference path="../typings/tsd.d.ts" />
/// <reference path="scatter_plot.ts" />
/// <reference path="slider.ts" />
/// <reference path="snapping_brush.ts" />

interface ParameterSet {
  id: number;
  point: number[];
  result: number;
  num_runs: number;
}

interface Domain {
  min: number;
  max: number;
}

interface Domains {
  // numParams: number;
  paramDomains: Domain[];  // size: numParams
  numOutputs: number;
  outputDomains: Domain[]; // size: numOutputs
}

class ScatterSequence {
  private _scatterPlot: ScatterPlot;
  private _minTime: number;
  private _maxTime: number;
  private _domains: Domains;
  private _timeSlider: Slider;
  private _brushes: SnappingBrush[] = [];

  constructor(selector: string) {
    this._scatterPlot = new ScatterPlot(selector);
    this.getDomains();
  }
  
  private getDomains() {
    d3.json('/time_domains', (error: any, domains:[number,number]) => {
      this._minTime = domains[0];
      this._maxTime = domains[1];
      d3.json('/domains', (error:any, domains: Domains) => {
        this._domains = domains;
        this.addOptions();
        this.appendSlider();
        this.appendBrushes();
        this.reload();
      });
    });
  }
  
  private addOptions() {
    var xkey = d3.select('#xkey');
    for( var i=0; i < this._domains.paramDomains.length; i++) {
      var opt = xkey.append('option').text(i);
      if(i==0) { opt.attr('selected', 'selected'); }
    }
    var ykey = d3.select('#ykey');
    for( var i=0; i < this._domains.paramDomains.length; i++) {
      var opt = ykey.append('option').text(i);
      if(i==1) { opt.attr('selected', 'selected'); }
    }

    var onSelectionChange = () => {
      this.reload();
    };
    xkey.on('change', onSelectionChange);
    ykey.on('change', onSelectionChange);
  }
  
  private drawScatterPlot() {
    var xkey = parseInt( (<HTMLSelectElement>d3.select('#xkey').node()).value );
    var ykey = parseInt( (<HTMLSelectElement>d3.select('#ykey').node()).value );
    var xdomain = this._domains.paramDomains[xkey];
    var ydomain = this._domains.paramDomains[ykey];
    this._scatterPlot.setDomainAndAxis([xdomain.min, xdomain.max],[ydomain.min, ydomain.max]);
    var tmax = this._timeSlider.value();
    var extents = this._brushes.map( (brush:SnappingBrush) => {
      return brush.extent();
    });
    var url = `/sp_data?tmax=${tmax}&xkey=${xkey}&ykey=${ykey}&ranges=${JSON.stringify(extents)}`;
    d3.json(url, (err:any, data: any) => {
      var keys = Object.keys(data).map( (key) => {
        var a = JSON.parse(key);
        return {x: a[0], y: a[1]};
      });
      this._scatterPlot.load(keys, false);
    });
  }
  
  private reload() {
    this.drawScatterPlot();
  }
  
  private appendBrushes() {
    var sel = d3.select('#brushes');

    for( var i=0; i < this._domains.paramDomains.length; i++) {
      var id = `brush_${i}`;
      var opt = sel.append('div').attr('id', id);
      var domain = this._domains.paramDomains[i];
      var brush = new SnappingBrush(`#${id}`, domain.min, domain.max, i.toString());
      brush.setCallback( (x0,x1) => { this.reload();} );
      this._brushes.push(brush);
    }
  }
  
  private appendSlider() {
    this._timeSlider = new Slider('#time_slider', this._minTime, this._maxTime, "time");
    this._timeSlider.setCallback((f:number) => { this.reload(); } );
  }
}
