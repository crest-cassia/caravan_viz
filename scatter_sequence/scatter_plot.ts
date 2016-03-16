/// <reference path="../typings/tsd.d.ts" />

// serverから得られるデータの方はIntefaceとして定義
interface DataPoint {
  x: number;
  y: number;
};

class ScatterPlot {
  // d3でPlotを作る際の典型的なパターンとして、
  // svg要素を作って、その中に描画要素を<g>要素として作成する
  // 描画領域の幅と高さを _width, _heightとして定義し、
  // その周辺のpaddingの大きさを _padding として定義する 
  // d3.Selectionの型パラメータはanyにしているが、ここには何の型を入れるべきなのかわかっていない。
  protected _svg: d3.Selection<any>;
  protected _width = 800;
  protected _height = 600;
  protected _padding = {left: 50, right: 30, top: 30, bottom: 30};

  protected _pointsGroup: d3.Selection<any>;  // Plotのデータ点を保持するグループ
  protected _xAxisGroup: d3.Selection<any>;   // x軸を保持するグループ
	protected _yAxisGroup: d3.Selection<any>;   // y軸を保持するグループ
  protected _xScale: d3.scale.Linear<number,number>;  // xScale。型パラメータは変換の前後の型
  protected _yScale: d3.scale.Linear<number,number>;  // yScale
  
  constructor(container:string) {
    var selection = d3.select(container);
    this._svg = selection.append('svg')  // svg要素を作成。paddingも含めたサイズになる。
      .attr({
			  'width': this._padding.left + this._width + this._padding.right,
				'height': this._padding.top + this._height + this._padding.bottom
			});
    
    // svgの仕様 : g要素に transform という属性をつけることによって座標系を変換することができる
    //   <g class="points" transform="translate(30,50)"> という要素を作る
    this._pointsGroup = this._svg.append('g')
      .classed('points', true)
      .attr({
        // Typescriptで文字列の埋め込みは、バッククオートと${...}で行うことができる
        // JSより記述を大幅に簡略化できる
        'transform' : `translate(${this._padding.left},${this._padding.top})`
      });
    this._xAxisGroup = this._svg.append('g')
      .classed('axis', true)
      .attr({
        'transform' : `translate(${this._padding.left},${this._height+this._padding.top})`
      });
    this._yAxisGroup = this._svg.append('g')
      .classed('axis', true)
      .attr({
        'transform' : `translate(${this._padding.left},${this._padding.top})`
      });
  }
  
  public setDomainAndAxis(xdomain:[number,number], ydomain:[number,number]) {
    this.createXAxis(xdomain[0], xdomain[1]);
    this.createYAxis(ydomain[0], ydomain[1]);
  }
  
  public load(dataPoints: DataPoint[], autoScale: Boolean) {
    // TSにはアロー関数式というfunction相当のものを手軽に書く記法がある
    //   example: (x) => { return x*x; }
    // ただし、アロー関数式の中ではthisが書き換えられない
    // 多くの場合、この方が直感的に動くが、JSのコードを機械的に変換しているとハマることがあるので注意
    
    if( autoScale ) {
      // 配列から最小、最大を取り出すd3のメソッド
      var minX = d3.min( dataPoints, (d)=>d.x );
      var maxX = d3.max( dataPoints, (d)=>d.x );
      this.createXAxis(minX, maxX);  // X軸を作って、_xScaleをセットする
      var minY = d3.min( dataPoints, (d)=>d.y );
      var maxY = d3.max( dataPoints, (d)=>d.y );
      this.createYAxis(minY, maxY);  // 同上
    }
    
    // データ点に対応するcircle要素を作成していく
    var dataSelection = this._pointsGroup
      .selectAll('.point')
      .data( dataPoints );
      // '.point'の全要素を選択。ただしこの時点では何も存在しない
      // dataの配列をバインドする
    dataSelection.enter().append('circle')
      .classed('point', true);
      // バインドしたデータの個数と要素の個数が合っていないので、不足分に対して <circle class="point">を付与する 
    dataSelection.attr({
      'cx': (d:DataPoint)=> this._xScale(d.x),
      'cy': (d:DataPoint)=> this._yScale(d.y),
      'r' : 4
    });
    dataSelection.exit().remove();
      // circleの各要素に対して cx, cy, r の属性をセットしていく
      // それぞれ、svgのcircle要素の中心の座標と半径を表す
  };
  
  private createXAxis( minX: number, maxX: number ) {
    // domainからrangeへの線形な変換なので、d3.scale.lineaer() を呼ぶ
    this._xScale = d3.scale.linear()
      .domain([minX, maxX])
      .range([0, this._width])
      .nice();  // nice()をつけると、domainが中途半端な端点を持つとき、いい具合に丸めてくれる
    var axis = d3.svg.axis().scale(this._xScale).orient('bottom');
      // orient というのは軸のtickができる方向。x軸なので線の下部にtickをつける
    this._xAxisGroup.call(axis);
      // d3.Selection#callを実行すると、引数にした関数が実行される。つまり axis(this._xAxisGroup) と等価
      // axis generatorを実行すると要素の下部に軸の描画要素が作成される。
      // line,path,textなどが追加される。
      // cssで .axis path,line の要素に適切にスタイルを設定する必要がある。
      // 特に fill:none を設定しておかないと、太い線が現れるだけになってしまうので注意。
  }
  
  private createYAxis( minY: number, maxY: number ) {
    this._yScale = d3.scale.linear()
      .domain([minY, maxY])
      .range([this._height, 0])  // 上むきの軸なので、rangeは　height->0 の方向
      .nice();
    var axis = d3.svg.axis().scale(this._yScale).orient('left');
    this._yAxisGroup.call(axis);
  }

};
