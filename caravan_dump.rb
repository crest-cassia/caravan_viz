require 'pp'
require 'pry'

class CARAVAN_DUMP

  attr_reader :num_params, :num_outputs, :parameter_sets, :runs

  def initialize( filename )
    @io = File.open( filename, 'rb' )

    @num_params = read_int64
    @num_outputs = read_int64

    num_ps = read_int64
    @parameter_sets = read_pss( num_ps )

    num_runs = read_int64
    @runs = read_runs( num_runs )

    raise unless @io.eof?
  end

  private

  BIG_ENDIAN = [1].pack("s") == [1].pack("n")

  def read_int64
    b = @io.read(8)
    BIG_ENDIAN ? b.unpack("q").first : b.reverse.unpack("q").first
  end

  def read_pss( num_ps )
    num_bytes_per_ps = 8 + 8*@num_params
    b = @io.read( num_ps * num_bytes_per_ps )

    pss = Array.new( num_ps ) do |i|
      bytes = b[ (i*num_bytes_per_ps)..((i+1)*num_bytes_per_ps-1) ]
      ps = read_ps_from_bytes(bytes)
    end
    pss
  end

  def read_ps_from_bytes(b)
    id = BIG_ENDIAN ? b[0..7].unpack("q").first : b[0..7].reverse.unpack("q").first
    point = BIG_ENDIAN ? b[8..-1].unpack("q#{@num_params}") : b[8..-1].reverse.unpack("q#{@num_params}").reverse
    ps = {"id" => id, "point" => point }
    ps
  end

  def read_runs(num_runs)
    num_bytes_per_run = 8 * (3+@num_outputs+3)
    b = @io.read( num_runs * num_bytes_per_run )

    runs = Array.new( num_runs ) do |i|
      bytes = b[ (i*num_bytes_per_run)..((i+1)*num_bytes_per_run-1) ]
      run = read_run_from_bytes(bytes)
    end
    runs
  end

  def read_run_from_bytes( b )
    id, parent_ps_id, seed = BIG_ENDIAN ? b[0..23].unpack("qqq") : b[0..23].reverse.unpack("qqq").reverse
    result = b[24..-25].unpack("G#{@num_outputs}")
    place_id, start_at, finish_at = BIG_ENDIAN ? b[-24..-1].unpack("qqq") : b[-24..-1].reverse.unpack("qqq").reverse
    run = {"id"=>id, "parentPSId"=>parent_ps_id, "seed"=>seed, "result"=>result,
           "placeId"=>place_id, "startAt"=>start_at, "finishAt"=>finish_at}
    run
  end
end

if __FILE__ == $0
  dump = CARAVAN_DUMP.new( ARGV[0] )
  binding.pry
end

