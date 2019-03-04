require 'pp'
require_relative 'caravan_dump'

d = CARAVAN_DUMP.load(ARGV[0])

elapsed = d.map {|t| (t[:finishAt]-t[:startAt]).to_f/1000 }
histo = Hash.new(0)
BIN = 100
elapsed.each do |e|
  histo[(e.to_i/BIN)*BIN] += 1
end
puts histo.sort_by {|k,v| k}.map {|a| a.join(' ')}
