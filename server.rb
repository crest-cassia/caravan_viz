require 'pp'
require 'sinatra'
require 'sinatra/reloader'
require 'pry'
require 'json'

set :public_folder, File.dirname(__FILE__) + '/'

get '/' do
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
  tasks = tasks.select {|t| t[:finishAt] > 0 }
  min_start_at = tasks.map {|t| t[:startAt] }.min
  tasks.each {|t| t[:startAt] = (t[:startAt] - min_start_at)/1000.0; t[:finishAt] = (t[:finishAt] - min_start_at)/1000.0 }
end

require_relative 'caravan_dump'
$stderr.puts "Loading #{ARGV[0]}"
$tasks = CARAVAN_DUMP.load(ARGV[0])
$stderr.puts "Normalizing results"
nomralize_tasks( $tasks )
$stderr.puts "Initialization finished"

#########################
### timeline ############
#########################

# return runs in JSON
# filter out the runs based on the given parameter
#   example: /runs?place=0-100
#   => list of runs whose placeId is in [0,100]
get '/runs' do
  content_type :json
  place_range = []
  if params["place"]
    place_range = params["place"].split('-').map(&:to_i)
  else
    place_range = [0,300]   # default value
  end
  selected = $tasks.select {|t|
    place = t[:placeId]
    (!place_range[0] || place >= place_range[0]) &&
    (!place_range[1] || place <= place_range[1])
  }
  selected.to_json
end

get '/filling_rate' do
  calc_filling_rate_and_place_range($tasks).to_json
end

def calc_filling_rate_and_place_range(tasks)
  min_start_at = tasks.map {|t| t[:startAt] }.min
  max_finish_at = tasks.map {|t| t[:finishAt] }.max
  places = tasks.map {|t| t[:placeId] }.uniq
  #places.each {|place|
  #  calc_filling_rate_and_place_range2(tasks,place)
  #}
  num_places = places.size
  duration = tasks.inject(0) {|sum,run| sum + (run[:finishAt] - run[:startAt]) }
  filling_rate = duration.to_f / ((max_finish_at - min_start_at) * num_places)
  place_range = places.minmax
  {filling_rate: filling_rate, place_range: place_range, num_consumer_places: num_places, num_runs: tasks.size}
end

def calc_filling_rate_and_place_range2(tasks, place)
  place2_runs = tasks.select {|t| t[:placeId] == place }
  min_start_at = place2_runs.map {|r| r[:startAt] }.min
  max_finish_at = place2_runs.map {|r| r[:finishAt] }.max
  duration = place2_runs.inject(0) {|sum,run| sum + (run[:finishAt] - run[:startAt]) }
  filling_rate = duration.to_f / (max_finish_at - min_start_at)
  $stderr.puts "filling_rate @ #{place}: #{filling_rate}"
end

