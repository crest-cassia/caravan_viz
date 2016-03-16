/// <reference path="../typings/tsd.d.ts" />

class SnappingBrush {
  protected _drawGroup: d3.Selection<any>;
  protected _width = 800;
  protected _height = 15;
  protected _padding = {left: 50, right: 30, top: 20, bottom: 20};
  protected _title: string;

  protected _brush: d3.svg.Brush<any>;
  protected _xScale: d3.scale.Linear<number,number>;
  
  protected _callback: (x0:number,x1:number)=>void;
  
  constructor(container:string, min:number, max:number, title: string) {
    // 実装方針:
    //   整数にsnapするbrush。
    //   背景をrectで作成する
    //   rectにAxisを使って線を入れて描画領域が見えやすくなるようにする
    //   もう一つAxisを入れて、rect配下に軸を描画
    //   brushを作成
    //   http://bl.ocks.org/mbostock/6232620 を参考に実装
    this._title = title;
    this.createScale(min, max);
    this.drawRectAndAxis(container);
    this.createBrush();
  }
  
  // brushされたときに呼ばれる関数
  public setCallback( f: (x0:number,x1:number)=>void ) {
    this._callback = f;
  }
  
  public extent():[number,number] {
    var ext = <[number,number]> this._brush.extent();
    return [Math.ceil(ext[0]), Math.floor(ext[1])];
  }
  
  private createScale(min: number, max: number) {
    this._xScale = d3.scale.linear()
      .domain( [Math.round(min)-0.5, Math.round(max)+0.5] )
      .range( [0, this._width] )
      .clamp(true);  // domain外の値が与えられたときに外挿せずに常にrange内の値を返す
  }
  
  private createBrush() {
    this._brush = d3.svg.brush()  // brush generatorを作成
      .x( this._xScale )  // xScaleをセット
      .extent(  <[number,number]> this._xScale.domain() );     // extentの初期値。1次元のbrushなので１次元配列を渡す

    var gBrush = this._drawGroup.append("g")
      .attr("class", "brush")
      .call( this._brush );    // brushを描画
    gBrush.selectAll("rect")   // brushの表示領域のheightをセット
      .attr("height", this._height);

    this._brush.on("brush", () => {
      var ext = <[number,number]> this._brush.extent();
      var new_ext: [number,number];
      
      // ドラッグの場合
      if( d3.event.mode === "move" ) {
        var x0 = Math.round( ext[0]-0.5 )+0.5;
        var x1 = x0 + Math.round(ext[1]-ext[0]);
        new_ext = [x0,x1];
      }
      else {  // 大きさを変えた場合
        var x0 = Math.round( ext[0]-0.5 )+0.5;
        var x1 = Math.round( ext[1]-0.5 )+0.5;
        if( x1 - x0 <= 1 ) {
          x0 = Math.round( ext[0] ) - 0.5;
          x1 = x0 + 1;
        }
        new_ext = [x0,x1];
      }
      // brushを再描画
      gBrush.call( this._brush.extent(new_ext) );
      
      // callback関数を呼ぶ
      if( this._callback ) {
        this._callback( Math.ceil(new_ext[0]), Math.floor(new_ext[1]) );
      }
    });
  }
  
  private drawRectAndAxis(container: string) {
    var svg = d3.select(container).append('svg')  // svg要素を作成。paddingも含めたサイズになる。
      .attr({
			  'width': this._padding.left + this._width + this._padding.right,
				'height': this._padding.top + this._height + this._padding.bottom
			});
    svg.append("text")
      .attr({
        'x': this._padding.left,
        'dx': '-.8em',
        'y': this._padding.top + this._height,
        'startOffset': "100%",
        'text-anchor': 'end' 
      })
      .style('font-size', this._height)
      .text(this._title);
    this._drawGroup = svg.append("g")
      .attr("transform", `translate(${this._padding.left},${this._padding.top})`);
    
    // 背景となるrectを描画
    this._drawGroup.append("rect")
      .attr({
        "class": "grid-background",
        "width": this._width,
        "height": this._height
      });
    
    // 背景のrectに対してAxisで線を描画
    var numTicks = Math.round( this._xScale.domain()[1] - this._xScale.domain()[0] + 1 );
    if( numTicks > 10 ) { numTicks = 10; }
    this._drawGroup.append('g')
      .attr('class', "x grid")
      .attr("transform", `translate(0,${this._height})`)
      .call(
        d3.svg.axis()
          .scale(this._xScale)
          .orient("bottom")
          .tickSize(-this._height)
          .tickFormat("")
          .ticks(numTicks)
      );

    // 軸を描画
    this._drawGroup.append("g")
      .attr("class", "x axis")
      .attr("transform", `translate(0,${this._height})`)
      .call(
        d3.svg.axis()
          .scale(this._xScale)
          .orient("bottom")
          .ticks(numTicks)
      );
  }
};
