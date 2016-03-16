require 'pp'
require 'sinatra'
require 'sinatra/reloader'
require 'pry'
require 'json'

set :public_folder, File.dirname(__FILE__) + '/'

get '/' do
  redirect '/index.html'
end

unless ARGV.size == 2 or ARGV.size == 1
  $stderr.puts "Usage: ruby server.rb runs.json [parameter_sets.json]"
  raise "invalid argument"
end

runs = JSON.parse( File.open(ARGV[0]).read ).select {|run| run["finishAt"] > 0 }
parameter_sets = JSON.parse( File.open(ARGV[1]).read ) if ARGV[1]

min_start_at = runs.map {|run| run["startAt"] }.min
runs.each {|run| run["startAt"] = (run["startAt"] - min_start_at)/1000.0; run["finishAt"] = (run["finishAt"] - min_start_at)/1000.0 }

def calc_filling_rate(runs)
  min_start_at = runs.map {|run| run["startAt"] }.min
  max_finish_at = runs.map {|run| run["finishAt"] }.max
  num_places = runs.uniq {|run| run["placeId"] }.size
  duration = runs.inject(0) {|sum,run| sum + (run["finishAt"] - run["startAt"]) }
  filling_rate = duration.to_f / ((max_finish_at - min_start_at) * num_places)
  filling_rate
end

def calc_domains(parameter_sets, runs)
  num_params = parameter_sets.first["point"].size
  param_domains = Array.new(num_params) do |i|
    d = parameter_sets.map {|ps| ps["point"][i] }.minmax
    {min: d[0], max: d[1]}
  end

  num_outputs = 1
  output_domains = Array.new(num_outputs) do |i|
    d = runs.map {|run| run["result"][0] }.minmax
    {min: d[0], max: d[1]}
  end

  { numParams: num_params,
    paramDomains: param_domains,
    numOutputs: num_outputs,
    outputDomains: output_domains
  }
end

def calc_averaged_result(parameter_sets, runs)
  psid_result = Hash.new { Array.new }
  runs.each do |run|
    r = run["result"][0]
    psid = run["parentPSId"]
    psid_result[ psid ] += [r]
  end
  parameter_sets.each do |ps|
    results = psid_result[ ps["id"] ]
    if results.size > 0
      avg = results.inject(:+).to_f / results.size
      ps["result"] = avg
    else
      ps["result"] = nil
    end
  end
  parameter_sets.select! {|ps| ps["result"] }
end

def calc_interpolation(target, point2result)
  distance = lambda {|p1,p2|
    Math.sqrt( p1.zip(p2).map {|x,y| (x-y)*(x-y) }.inject(:+) )
  }

  close_points = point2result.keys.sort_by {|point|
    distance.call(point, target)
  }
  dr = close_points[0..1].map {|point| [ distance.call(point, target), point2result[point] ] }
  d_sum = dr.map {|d,r| d }.inject(:+)
  interpolated = dr.map {|d,r| (d/d_sum.to_f) * r }.inject(:+)
  interpolated
end

domains = calc_domains(parameter_sets, runs)
calc_averaged_result(parameter_sets, runs)

$stderr.puts "filling_rate: #{calc_filling_rate(runs)}"

# example: /filter?x0=1&x1=2
#  => list of parameter sets whose point is [1,2,...]
get '/filter' do
  content_type :json

  target = Array.new(domains[:numParams])
  params.each_pair do |key,val|
    n = key[1..-1].to_i
    v = val.to_i
    target[n] = v
  end
  selected = parameter_sets.select do |ps|
    target.each_with_index.all? {|x,idx| x.nil? or ps["point"][idx] == x }
  end

  # interpolation by two nearest points
  # calc_interpolation = lambda {
  #   point2result = Hash.new
  #   parameter_sets.map {|ps| point2result[ps["point"]] = ps["result"] }
  #   idx = target.index(nil)
  #   interpolated = (domains[:paramDomains][idx][:min]..domains[:paramDomains][idx][:max]).map do |x|
  #     point = target.dup
  #     point[idx] = x
  #     found = selected.find {|ps| ps["point"] == point }
  #     if found
  #       found
  #     else
  #       result = calc_interpolation(point, point2result)
  #       {id: -1, point: point, result: result, num_runs: 0}
  #     end
  #   end
  #   interpolated
  # }
  # data = calc_interpolation.call()

  data = selected

  data.to_json
end

# /domains  =>
# interface Domains {
#   numParams: number;
#   paramDomains: Domain[];  // size: numParams
#   numOutputs: number;
#   outputDomains: Domain[]; // size: numOutputs
# }
# interface Domain {
#   min: number;
#   max: number;
# }
get '/domains' do
  content_type :json
  domains.to_json
end

get '/time_domains' do
  content_type :json
  min_start_at = runs.map {|run| run["startAt"] }.min
  max_finish_at = runs.map {|run| run["finishAt"] }.max
  [min_start_at, max_finish_at].to_json
end

get '/runs' do
  content_type :json
  runs.to_json
  # runs.select{|run| run["placeId"] < 50}.to_json
end

# return data for scatter plot
# parameters:
#   tmax: return parameter sets who has finished by tmax
#   xkey: dimension for x-axis
#   ykey: dimension for y-axis
#   ranges: two-dim array specifying the range to show
get '/sp_data' do
  tmax = params["tmax"].to_f
  xkey = params["xkey"].to_i
  ykey = params["ykey"].to_i
  ranges = JSON.parse( params["ranges"] )

  ps_points = {}
  parameter_sets.each do |ps|
    point = ps["point"]
    if is_in_range(point, ranges)
      x = ps["point"][xkey]
      y = ps["point"][ykey]
      ps_points[ ps["id"] ] = [x,y]
    end
  end

  points_count = Hash.new(0)
  runs.select {|run| run["finishAt"] < tmax }.each do |run|
    point = ps_points[ run["parentPSId"] ]
    points_count[ point ] += 1 if point
  end
  
  points_count.to_json
end

def is_in_range(point, ranges)
  ranges.each_with_index.all? do |(from,to), idx|
    point[idx] >= from and point[idx] <= to
  end
end

