require 'pp'
require 'sinatra'
require 'sinatra/reloader'
require 'pry'
require 'json'
require 'msgpack'

set :public_folder, File.dirname(__FILE__) + '/'
set :static_cache_control, [:public, max_age: 0] #disable caching

after do
  cache_control :no_cache
end

get '/' do
  redirect '/timeline.html'
end

get '/reload' do
  load_input
  redirect '/timeline.html'
end

unless ARGV.size == 1
  $stderr.puts "Usage: ruby server.rb tasks.bin"
  raise "invalid argument"
end

#########################
### initialize ##########
#########################

def nomralize_tasks( tasks )
  tasks = tasks.select {|t| t["finish_at"] > 0 }
  min_start_at = tasks.map {|t| t["start_at"] }.min
  tasks.each {|t| t["start_at"] = (t["start_at"] - min_start_at)/1000.0; t["finish_at"] = (t["finish_at"] - min_start_at)/1000.0 }
end

def load_input
  $stderr.puts "Loading #{ARGV[0]}"
  $tasks = MessagePack.unpack( File.open(ARGV[0]).read ).map {|a| a[1]}
  $stderr.puts "Normalizing results"
  nomralize_tasks( $tasks )
  $stderr.puts "Initialization finished"
end

load_input

#########################
### timeline ############
#########################

# return runs in JSON
# filter out the runs based on the given parameter
#   example: /runs?rank=0-100
#   => list of runs whose rank is in [0,100]
get '/runs' do
  content_type :json
  rank_range = []
  if params["rank"]
    rank_range = params["rank"].split('-').map(&:to_i)
  else
    rank_range = [0,300]   # default value
  end
  selected = $tasks.select {|t|
    rank = t["rank"]
    (!rank_range[0] || rank >= rank_range[0]) &&
    (!rank_range[1] || rank <= rank_range[1])
  }
  selected.to_json
end

get '/filling_rate' do
  calc_filling_rate_and_rank_range($tasks).to_json
end

def calc_filling_rate_and_rank_range(tasks)
  min_start_at = tasks.map {|t| t["start_at"] }.min
  max_finish_at = tasks.map {|t| t["finish_at"] }.max
  ranks = tasks.map {|t| t["rank"] }.uniq
  num_ranks = ranks.size
  duration = tasks.inject(0) {|sum,run| sum + (run["finish_at"] - run["start_at"]) }
  filling_rate = duration.to_f / ((max_finish_at - min_start_at) * num_ranks)
  rank_range = ranks.minmax
  filename = ARGV[0]
  file_info = File.mtime(filename).to_s
  {file: filename, file_info: file_info, filling_rate: filling_rate, rank_range: rank_range, num_consumer_ranks: num_ranks, num_runs: tasks.size, max_finish_at: max_finish_at}
end

def calc_filling_rate_and_rank_range2(tasks, rank)
  rank2_runs = tasks.select {|t| t["rank"] == rank }
  min_start_at = rank2_runs.map {|r| r["start_at"] }.min
  max_finish_at = rank2_runs.map {|r| r["finish_at"] }.max
  duration = rank2_runs.inject(0) {|sum,run| sum + (run["finish_at"] - run["start_at"]) }
  filling_rate = duration.to_f / (max_finish_at - min_start_at)
  $stderr.puts "filling_rate @ #{rank}: #{filling_rate}"
end

