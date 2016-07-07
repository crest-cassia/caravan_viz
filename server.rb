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
  $stderr.puts "    or ruby server.rb dump.bin"
  raise "invalid argument"
end

#########################
### initialize ##########
#########################

def load_json
  $runs = JSON.parse( File.open(ARGV[0]).read )
  $parameter_sets = JSON.parse( File.open(ARGV[1]).read ) if ARGV[1]

  normalize_runs( $runs )
  set_averaged_result_to_ps( $parameter_sets, $runs )
end

def normalize_runs( runs )
  runs = runs.select {|run| run["finishAt"] > 0 }
  min_start_at = $runs.map {|run| run["startAt"] }.min
  runs.each {|run| run["startAt"] = (run["startAt"] - min_start_at)/1000.0; run["finishAt"] = (run["finishAt"] - min_start_at)/1000.0 }
end

def set_averaged_result_to_ps(parameter_sets, runs)
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

if ARGV[0] =~ /\.json$/
  load_json
else
  require_relative 'caravan_dump'
  dump = CARAVAN_DUMP.new(ARGV[0])
  $parameter_sets = dump.parameter_sets
  $runs = dump.runs
  normalize_runs( $runs )
  set_averaged_result_to_ps( $parameter_sets, $runs )
end

#########################
### timeline ############
#########################

get '/runs' do
  content_type :json
  $runs.to_json
end

get '/filling_rate' do
  calc_filling_rate($runs).to_s
end

def calc_filling_rate(runs)
  min_start_at = runs.map {|run| run["startAt"] }.min
  max_finish_at = runs.map {|run| run["finishAt"] }.max
  num_places = runs.uniq {|run| run["placeId"] }.size
  duration = runs.inject(0) {|sum,run| sum + (run["finishAt"] - run["startAt"]) }
  filling_rate = duration.to_f / ((max_finish_at - min_start_at) * num_places)
  filling_rate
end

#########################
### lineplot ############
#########################

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
  calc_domains( $parameter_sets, $runs).to_json
end

# return data point of lineplot
# example: /filter?x0=1&x1=2
#  => list of parameter sets whose point is [1,2,...]
get '/filter' do
  content_type :json

  target = Array.new( $parameter_sets.first["point"].size )
  params.each_pair do |key,val|
    n = key[1..-1].to_i
    v = val.to_i
    target[n] = v
  end
  data = $parameter_sets.select do |ps|
    target.each_with_index.all? {|x,idx| x.nil? or ps["point"][idx] == x }
  end
  data.to_json
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

#########################
### scatter plot ########
#########################

get '/time_domains' do
  content_type :json
  min_start_at = $runs.map {|run| run["startAt"] }.min
  max_finish_at = $runs.map {|run| run["finishAt"] }.max
  [min_start_at, max_finish_at].to_json
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
  $parameter_sets.each do |ps|
    point = ps["point"]
    if is_in_range(point, ranges)
      x = ps["point"][xkey]
      y = ps["point"][ykey]
      ps_points[ ps["id"] ] = [x,y]
    end
  end

  points_count = Hash.new(0)
  $runs.select {|run| run["finishAt"] < tmax }.each do |run|
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

