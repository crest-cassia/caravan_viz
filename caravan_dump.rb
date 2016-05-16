require 'pp'

class CARAVAN_DUMP

  attr_reader :num_params, :num_outputs, :parameter_sets, :runs

  def initialize( filename )
    @io = File.open( filename, 'rb' )

    @num_params = read_int64
    @num_outputs = read_int64

    num_ps = read_int64
    @parameter_sets = []
    num_ps.times do |i|
      ps = read_ps
      @parameter_sets << ps
    end

    num_runs = read_int64
    @runs = []
    num_runs.times do |i|
      run = read_run
      @runs << run
    end

    raise unless @io.eof?
  end

  private

  BIG_ENDIAN = [1].pack("s") == [1].pack("n")

  def read_int64
    b = @io.read(8)
    BIG_ENDIAN ? b.unpack("q").first : b.reverse.unpack("q").first
  end

  def read_ps
    id = read_int64
    point = Array.new( @num_params, 0 )
    num_params.times do |i|
      point[i] = read_int64
    end
    ps = {"id" => id, "point" => point }
    return ps
  end

  def read_run
    id = read_int64
    parent_ps_id = read_int64
    seed = read_int64
    result = @io.read(8*@num_outputs).unpack("G#{@num_outputs}")
    place_id = read_int64
    start_at = read_int64
    finish_at = read_int64
    run = {"id"=>id, "parentPSId"=>parent_ps_id, "seed"=>seed, "result"=>result,
           "placeId"=>place_id, "startAt"=>start_at, "finishAt"=>finish_at}
    return run
  end
end

if __FILE__ == $0
  dump = CARAVAN_DUMP.new( ARGV[0] )
  pp dump
end

