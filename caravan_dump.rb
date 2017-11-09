require 'pp'
require 'pry'

class CARAVAN_DUMP

  def self.load( filename )
    @io = File.open( filename, 'rb' )
    read_tasks
  end

  private

  BIG_ENDIAN = [1].pack("s") == [1].pack("n")

  def self.read_int64
    b = @io.read(8)
    BIG_ENDIAN ? b.unpack("q").first : b.reverse.unpack("q").first
  end

  def self.read_tasks
    tasks = []
    header_size = 8 * 6 # taskId,rc,placeId,startAt,finishAt,numResults
    while b = @io.read(header_size)
      tasks << read_a_task(b)
    end
    tasks
  end

  def self.read_a_task(b)
    id,rc,place_id,start_at,finish_at,num_results = BIG_ENDIAN ? b.unpack("qqqqqq") : b.reverse.unpack("qqqqqq").reverse
    b_results = @io.read(8*num_results)
    raise "invalid format" if b_results.nil?
    results = b_results.unpack("G#{num_results}")
    {id:id,rc:rc,placeId:place_id,startAt:start_at,finishAt:finish_at,results:results}
  end
end

if __FILE__ == $0
  dump = CARAVAN_DUMP.load( ARGV[0] )
  pp dump
end

