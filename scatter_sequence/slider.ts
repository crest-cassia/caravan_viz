/// <reference path="../typings/tsd.d.ts" />

class Slider {
  protected _drawGroup: d3.Selection<any>;
  protected _width = 800;
  protected _height = 15;
  protected _padding = {left: 50, right: 30, top: 30, bottom: 30};
  protected _title:string;

  protected _brush: d3.svg.Brush<any>;
  protected _xScale: d3.scale.Linear<number,number>;
  protected _handle: d3.Selection<any>;
  
  protected _callback: (number)=>void; 
  
  constructor(container:string, min:number, max:number, title: string) {
    // sliderを実装する方針:
    //   axisとcircleを使ってsliderの見た目を実装する
    //   axisの背景に透明なbrushを配置
    //   背景がクリックされると、その場所にcircleをずらして値を更新する
    //   見た目上はcircleを動かしているように見える
    //   http://bl.ocks.org/mbostock/6452972 を参考に実装
    this._title = title;
    this.createScale(min, max);
    this.createBrush();
    this.drawAxisAndBrush(container);
  }
  
  // brushされたときに呼ばれる関数
  public setCallback( f: (number)=>void ) {
    this._callback = f;
    this._brush.event( this._drawGroup );
  }
  
  public value(): number {
    return <number>this._brush.extent()[0];
  }
  
  private createScale(min: number, max: number) {
    this._xScale = d3.scale.linear()
      .domain( [min,max] )
      .range( [0, this._width] )
      .clamp(true);  // domain外の値が与えられたときに外挿せずに常にrange内の値を返す
  }
  
  private createBrush() {
    this._brush = d3.svg.brush()  // brush generatorを作成
      .x( this._xScale )  // xScaleをセット
      .extent([0,0]);     // extentの初期値。1次元のbrushなので１次元配列を渡す
    this._brush.on("brush", () => {
      var value = <number> this._brush.extent()[0];
      /*
      if ( (<d3.BaseEvent>d3.event).sourceEvent ) { // not a programmatic event
        value = this._xScale.invert(d3.mouse(window)[0]);
        this._brush.extent([value, value]);
      }*/
      this._handle.attr("cx", this._xScale(value));
      if( this._callback ) {
        this._callback( value );
      }
    });
  }
  
  private drawAxisAndBrush(container: string) {
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
    // Axisを描画
    this._drawGroup.append('g')
      .attr('class', "x axis")
      .attr("transform", `translate(0,${this._height/2})`)
      .call(
        d3.svg.axis()
          .scale(this._xScale)
          .orient("bottom")
      )
      .select(".domain") // 軸を描画している path 要素を選択
        // path要素を複製して、.haloクラスをつける
        // haloは軸の中の細い線。slider内部の色を描画するクラス
        .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
        .attr("class", "halo");
    
    // 実際にsliderの機能を提供しているのはbrush
    var slider = this._drawGroup.append("g")
      .attr("class", "slider")
      .call( this._brush );
    // brushを実行すると .extentと.resize が作られるが不要なので削除
    slider.selectAll(".extent,.resize").remove();
    // .backgroundはbrushの背景のクリック可能な領域
    slider.select(".background")
      .attr("height", this._height);

    // ハンドルしているように見えるのは単なるcircle要素
    this._handle = slider.append("circle")
      .attr("class", "handle")
      .attr("transform", `translate(0,${this._height/2})`)
      .attr("r", 9);
    
    // callbackを呼ぶ
    //   eventメソッドは引数としてd3.selectionを取る
    slider
      .call(this._brush.event); 
  }
};
