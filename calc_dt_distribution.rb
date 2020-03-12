require 'pp'
require 'msgpack'

d = MessagePack.unpack( File.open(ARGV[0]).read ).map {|a| a[1]}

elapsed = d.map {|t| (t["finish_at"]-t["start_at"]).to_f/1000 }
histo = Hash.new(0)
BIN = 100
elapsed.each do |e|
  histo[(e.to_i/BIN)*BIN] += 1
end
puts histo.sort_by {|k,v| k}.map {|a| a.join(' ')}
