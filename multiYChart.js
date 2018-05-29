multiYChart = function () {
  this.initialize.apply(this, arguments);
};

multiYChart.prototype = {
  constructor: multiYChart,

  margin: {
    top: 20,
    right: 1,
    bottom: 1,
    left: 120
  },

  color: {
    temperature: '#3d88d9',
    respirationRate: '#d75249',
    blood: '#f4ac1b',
    pulseRate: '#3fc617'
  },

  initialize: function (options) {
    var that = this;

    this.id = options.id;

    this.beginTime = options.beginTime;
    this.endTime = this.getEndTime(this.beginTime, 7);
    this.dataSource = options.dataSource;
    this.zooming = options.zooming || false;
    this.containerWidth = options.width;
    this.containerHeight = options.height;

    this.width = this.containerWidth - this.margin.left - this.margin.right;
    this.height = this.containerHeight - this.margin.top - this.margin.bottom;
    this.axisWidth = this.margin.left / this.dataSource.length;

    // 定义比例尺scale
    // domain 显示的刻度范围,定义域
    // range 实际数据刻度,值域
    // x轴以时间为刻度
    this.x = d3
      .scaleTime()
      .domain([this.beginTime, this.endTime])
      .range([0, this.width]);

    // y轴按照像素值为刻度，所有数据需按照比例转换计算
    this.y = d3
      .scaleLinear()
      .domain([0, this.height])
      .range([this.height, 0]);

    // 定义轴 axis
    // axis需要和scale结合使用，作为参数传入 axis(scale)
    // ticks 表示刻度数量，如果是数值，默认 2,5,10这三个数
    // 如果刻度想要自定义需要利用tickValues([NO1,NO2,NO3...])实现
    // tickSize 表示刻度尺寸，设置为容器svg的宽高即实现了全图标尺效果
    this.xAxis = d3
      .axisTop(this.x)
      // .ticks(d3.timeHour.every(4))
      .tickValues(d3.timeHour.range(this.beginTime, this.endTime, 4))
      .tickSize(this.height)
      .tickFormat(function (d, i) {
        // return d.getHours();
        return;
      });

    this.yAxis = d3
      .axisLeft()
      .scale(this.y)
      .tickValues(d3.range(0, this.height, this.height / 40))
      .tickSize(-this.width)
      .tickFormat(function (d, i) {
        return;
      });

    // 折线模板
    this.line = d3
      .line()
      .x(function (d) {
        return that.x(d.datetime);
      })
      .y(function (d) {
        return that.y(d.svgValue);
      });

    this.createUI();
  },

  createUI: function () {
    var that = this;

    // 缩放
    // 缩放的最小最大比例
    var zoom = d3
      .zoom()
      .scaleExtent([1, 10])
      .translateExtent([
        [100, 100],
        [this.width, this.height]
      ])
      .on('zoom', zoomed);

    // reset
    d3.select('#reset').on('click', resetted);

    // 绘制svg容器
    this.svg = d3
      .select('#' + this.id)
      .append('svg')
      .attr('class', 'svg')
      .attr('width', this.width + this.margin.left + this.margin.right)
      .attr('height', this.height + this.margin.top + this.margin.bottom);

    // 绘制画布
    this.canvas = this.svg.append('g').attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

    if (this.zooming) {
      this.canvas.call(zoom);
    }

    // 绘制固定部分
    this.drowFixed();

    // 绘制x,y轴分隔线
    this.drowAxis();

    // 添加顶部时间轴
    this.drowTimeBar();

    // 渲染数据
    if (this.dataSource.length > 0) {
      this.renderData();
    }

    function zoomed() {
      //定义缩放方向
      let xScale = d3.event.transform.rescaleX(that.x);
      let yScale = d3.event.transform.rescaleX(that.y);

      // 原点x,y位移
      var panX = d3.event.transform.x;
      var panY = d3.event.transform.y;
      // 缩放比例
      var scaleMultiplier = d3.event.transform.k;

      // x,y轴缩放
      that.canvas.select('.x.axis').call(that.xAxis.scale(xScale));
      that.canvas.select('.y.axis').call(that.yAxis.scale(yScale));

      // 折线缩放
      that.canvas.selectAll('path.line').attr(
        'd',
        that.line
        .x(function (d) {
          return xScale(d.datetime);
        })
        .y(function (d) {
          return yScale(d.svgValue);
        })
      );

      // 数据点位置
      that.canvas
        .selectAll('circle')
        .attr('cx', function (d) {
          return xScale(d.datetime);
        })
        .attr('cy', function (d) {
          return yScale(d.svgValue);
        });

      // 顶部时间轴
      that.canvas
        .select('g.timeAxis')
        .selectAll('g')
        .attr('transform', function (d, i) {
          var move = i * that.width / 42;
          return 'translate(' + (scaleMultiplier * move + panX) + ', 0)';
        })
        .select('rect')
        .attr('width', scaleMultiplier * that.width / 42);

      that.canvas
        .select('g.timeAxis')
        .selectAll('g')
        .select('text')
        .attr('x', scaleMultiplier * that.width / 84);

      // 左侧数据轴
      that.svg
        .select('g.yAxisWrap')
        .selectAll('g')
        .selectAll('text.numberStick')
        .attr('transform', function (d, i) {
          var move = -i * that.height * scaleMultiplier / 8;
          if (i === 0) {
            move -= 10;
          } else if (i === 8) {
            move += 10;
          }
          return 'translate(-10,' + (move - panY) + ')';
        });
    }

    function resetted() {
      that.canvas
        .transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity);
    }

    // 定义箭头
    // this.defs = this.svg.append('defs');

    // this.arrowMarker = this.defs
    //   .append('marker')
    //   .attr('id', 'arrow')
    //   .attr('markerUnits', 'strokeWidth')
    //   .attr('markerWidth', '10')
    //   .attr('markerHeight', '10')
    //   .attr('viewBox', '0 0 12 12')
    //   .attr('refX', '6')
    //   .attr('refY', '6')
    //   .attr('orient', 'auto');

    // var arrow_path = 'M2,2 L10,6 L2,10 L6,6 L2,2';

    // this.arrowMarker
    //   .append('path')
    //   .attr('d', arrow_path)
    //   .attr('fill', '#f00');
  },

  drowFixed: function () {
    // 内容容器
    this.canvas
      .append('rect')
      .attr('width', this.width)
      .attr('height', this.height);

    // 左侧y轴容器
    this.svg
      .append('g')
      .attr('class', 'yAxisWrap')
      .attr('width', this.margin.left)
      .attr('height', this.height)
      .attr('transform', 'translate(0,' + this.margin.top + ')');

    this.svg
      .select('g.yAxisWrap')
      .append('rect')
      .attr('width', this.margin.left)
      .attr('height', this.height)
      .attr('stroke', '#ccc');

    // 左侧时间标题
    this.svg
      .append('g')
      .attr('class', 'timeTitle')
      .attr('width', this.margin.left)
      .attr('height', this.margin.top);

    this.svg
      .select('g.timeTitle')
      .append('rect')
      .attr('width', this.margin.left)
      .attr('height', this.margin.top)
      .attr('stroke', '#ccc');

    this.svg
      .select('g.timeTitle')
      .append('text')
      .attr('x', this.margin.left / 2)
      .attr('y', 12)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '14')
      .text('时间');
  },

  drowAxis: function () {
    var that = this;

    // 添加x轴分隔线
    this.canvas
      .append('g')
      .attr('class', 'x axis')
      .attr('transform', 'translate(0,' + this.height + ')')
      .call(this.xAxis);

    // 添加y轴分隔线
    this.canvas
      .append('g')
      .attr('class', 'y axis')
      .call(this.yAxis);

    // x轴分隔线样式
    this.canvas
      .select('g.x')
      .selectAll('g.tick')
      .filter(function (d, i) {
        return i % 6 === 0;
      })
      .select('line')
      .attr('class', 'xAxisLine');

    // y轴分隔线样式
    this.canvas
      .select('g.y')
      .selectAll('g.tick')
      .filter(function (d, i) {
        return i % 5 === 0;
      })
      .select('line')
      .attr('class', 'yAxisLine')
      .attr('stroke-width', 2);
  },

  drowTimeBar: function () {
    var that = this;
    var timeAxisData = [];

    for (var i = 1; i <= 7; i++) {
      for (var j = 1; j <= 6; j++) {
        timeAxisData.push(j * 4);
      }
    }

    this.canvas
      .append('g')
      .attr('class', 'timeAxis')
      .attr('transform', 'translate(0, -20)');

    var timeBar = this.canvas
      .select('g.timeAxis')
      .selectAll('g')
      .data(timeAxisData)
      .enter()
      .append('g')
      .attr('width', this.width / 42)
      .attr('height', this.margin.top)
      .attr('transform', function (d, i) {
        var move = i * that.width / 42;
        return 'translate(' + move + ', 0)';
      });

    timeBar
      .append('rect')
      .attr('stroke', '#ccc')
      .attr('width', this.width / 42)
      .attr('height', this.margin.top);

    timeBar
      .append('text')
      .attr('x', this.width / 84)
      .attr('y', 10)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('dy', '.35em')
      .text(function (d, i) {
        return d;
      });
  },

  renderData: function () {
    var that = this;
    this.dataSource.forEach(function (d, i) {
      // 绘制数据左侧对应y轴
      that.drowDataAxis(d, i);
      // 绘制数据线
      that.drowDataLines(d);
      // 绘制数据点
      that.drowDataCircles(d);
    });
  },

  drowDataAxis: function (info, index) {
    var that = this;
    var type = info.code;
    var axisData = [];
    var diff = (info.max - info.min) / 8;

    for (var i = 0; i < 9; i++) {
      axisData.push(info.min + i * diff);
    }

    var title = info.desc + info.unit;

    var wrap = this.svg.select('g.yAxisWrap');

    wrap
      .append('g')
      .attr('class', type + 'Axis')
      .attr('transform', 'translate(' + this.axisWidth * index + ', 0)');

    wrap
      .select('g.' + type + 'Axis')
      .append('rect')
      .attr('width', this.axisWidth)
      .attr('height', this.height)
      .attr('stroke', '#ccc');

    wrap
      .select('g.' + type + 'Axis')
      .selectAll('text')
      .data(axisData)
      .enter()
      .append('text')
      .attr('x', this.axisWidth)
      .attr('y', this.height)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('dy', '.35em')
      .attr('class', 'numberStick')
      .attr('transform', function (d, i) {
        var move = -i * that.height / 8;
        if (i === 0) {
          move -= 10;
        } else if (i === 8) {
          move += 10;
        }
        return 'translate(-10,' + move + ')';
      })
      .text(function (d, i) {
        return d;
      });

    wrap
      .select('g.' + type + 'Axis')
      .append('text')
      .attr('x', this.axisWidth / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '14')
      .text(title);
  },

  drowDataLines: function (info) {
    var that = this;
    var data = info.data;
    var type = info.code;
    // 数据转换
    data.forEach(function (d, i) {
      d.svgValue = that.getConvertValue(d.value, info.min, info.max, that.height);
    });

    // 添加数据线
    this.canvas
      .append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', this.color[type])
      .attr('stroke-linejoin', 'round')
      .attr('stroke-linecap', 'round')
      .attr('stroke-width', 1.5)
      .attr('class', 'line')
      .attr('d', this.line);
  },

  drowDataCircles: function (info) {
    var that = this;
    var data = info.data;
    var type = info.code;

    // 添加数据点
    this.canvas
      .append('g')
      .attr('class', type + 'CirclesWrap')
      .selectAll('circle')
      .data(data)
      .enter()
      .append('circle')
      .attr('stroke', this.color[type])
      .attr('fill', this.color[type])
      .attr('cx', function (d, i) {
        return that.x(d.datetime);
      })
      .attr('cy', function (d, i) {
        return that.y(d.svgValue);
      })
      .attr('r', function (d, i) {
        return 5;
      })
      .append('title')
      .text(function (d) {
        var content = '时间：' + that.format(d.datetime, 'yyyy-MM-dd hh:mm') + '\n' + info.desc + '：' + d.value + info.unit;
        return content;
      });
  },

  getConvertValue: function (value, min, max, height) {
    var factor = height / (max - min);
    return (value - min) * factor;
  },

  getEndTime: function (base, days) {
    if (days == undefined || days == '') {
      days = 7;
    }
    var date = new Date(base);
    date.setDate(date.getDate() + days);
    return date;
  },

  format: function (datetime, fmt) {
    var date = new Date(datetime)
    var o = {
      "M+": date.getMonth() + 1, // 月份
      "d+": date.getDate(), // 日
      "h+": date.getHours(), // 小时
      "m+": date.getMinutes(), // 分
      "s+": date.getSeconds(), // 秒
      "q+": Math.floor((date.getMonth() + 3) / 3), // 季度
      "S": date.getMilliseconds() // 毫秒
    };
    if (/(y+)/.test(fmt)) {
      fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
    }
    for (var k in o) {
      if (new RegExp("(" + k + ")").test(fmt)) {
        fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
      }
    }
    return fmt;
  }
};